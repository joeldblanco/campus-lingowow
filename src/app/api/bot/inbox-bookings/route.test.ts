import {it,expect,vi,afterEach} from 'vitest'
import {NextRequest} from 'next/server'
const mocks=vi.hoisted(()=>({auth:vi.fn(),reserve:vi.fn(),user:vi.fn()}))
vi.mock('@/lib/api-auth',()=>({authenticateRequest:mocks.auth}))
vi.mock('@/lib/db',()=>({db:{user:{findUnique:mocks.user}}}))
vi.mock('@/lib/inbox-booking',()=>({reserveInboxClass:mocks.reserve,BookingRejected:class extends Error{}}))
import {POST} from './route'
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks()})
it('production route is closed by default without authentication or booking calls',async()=>{
 vi.stubEnv('LINGOWOW_INBOX_BOOKING_ENABLED','0');const response=await POST(new NextRequest('http://localhost/api/bot/inbox-bookings',{method:'POST',headers:{Origin:'http://localhost'},body:'{}'}));expect(response.status).toBe(503);expect(mocks.auth).not.toHaveBeenCalled();expect(mocks.reserve).not.toHaveBeenCalled()
})
it('requires authenticated active admin even with write scope',async()=>{
 vi.stubEnv('LINGOWOW_INBOX_BOOKING_ENABLED','1');mocks.auth.mockResolvedValue({success:true,userId:'student'});mocks.user.mockResolvedValue({status:'ACTIVE',roles:['STUDENT']});const response=await POST(new NextRequest('http://localhost/api/bot/inbox-bookings',{method:'POST',headers:{Origin:'http://localhost'},body:'{}'}));expect(response.status).toBe(403);expect(mocks.auth).toHaveBeenCalledWith(expect.anything(),['inbox:bookings:write']);expect(mocks.reserve).not.toHaveBeenCalled()
})

it('rejects cookie-based cross-origin requests before authentication',async()=>{
 vi.stubEnv('LINGOWOW_INBOX_BOOKING_ENABLED','1');const response=await POST(new NextRequest('http://localhost/api/bot/inbox-bookings',{method:'POST',headers:{Origin:'https://evil.invalid'},body:'{}'}));expect(response.status).toBe(403);expect(mocks.auth).not.toHaveBeenCalled()
})

it('production cannot be activated by setting the feature flag',async()=>{
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('LINGOWOW_INBOX_BOOKING_ENABLED','1');const response=await POST(new NextRequest('http://localhost/api/bot/inbox-bookings',{method:'POST',body:'{}'}));expect(response.status).toBe(503);expect(mocks.reserve).not.toHaveBeenCalled()
})
