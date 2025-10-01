import { test, expect } from '@playwright/test';
import { TEST_USERS, DataGenerators } from '../utils/test-helpers';

test.describe('API Endpoints', () => {
  let authToken: string;

  // Helper function to get auth token
  async function getAuthToken(page: import('@playwright/test').Page, userType: 'admin' | 'teacher' | 'student' = 'admin') {
    const user = TEST_USERS[userType];
    
    const response = await page.request.post('/api/auth/signin', {
      data: {
        email: user.email,
        password: user.password
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    return data.token || data.accessToken;
  }

  test.describe('Authentication API', () => {
    test('POST /api/auth/signin - should authenticate user successfully', async ({ page }) => {
      const response = await page.request.post('/api/auth/signin', {
        data: {
          email: TEST_USERS.student.email,
          password: TEST_USERS.student.password
        }
      });

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe(TEST_USERS.student.email);
    });

    test('POST /api/auth/signin - should reject invalid credentials', async ({ page }) => {
      const response = await page.request.post('/api/auth/signin', {
        data: {
          email: 'invalid@test.com',
          password: 'wrongpassword'
        }
      });

      expect(response.status()).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('POST /api/auth/signup - should create new user', async ({ page }) => {
      const newUser = {
        name: 'New',
        lastName: 'User',
        email: DataGenerators.randomEmail(),
        password: 'NewUser123!'
      };

      const response = await page.request.post('/api/auth/signup', {
        data: newUser
      });

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe(newUser.email);
    });

    test('POST /api/auth/signup - should reject duplicate email', async ({ page }) => {
      const response = await page.request.post('/api/auth/signup', {
        data: {
          name: 'Test',
          lastName: 'User',
          email: TEST_USERS.student.email, // Existing email
          password: 'TestPassword123!'
        }
      });

      expect(response.status()).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('already exists');
    });

    test('POST /api/auth/logout - should logout user', async ({ page }) => {
      // First login
      const loginResponse = await page.request.post('/api/auth/signin', {
        data: {
          email: TEST_USERS.student.email,
          password: TEST_USERS.student.password
        }
      });
      
      expect(loginResponse.ok()).toBeTruthy();

      // Then logout
      const logoutResponse = await page.request.post('/api/auth/logout');
      expect(logoutResponse.ok()).toBeTruthy();
    });
  });

  test.describe('Courses API', () => {
    test.beforeEach(async ({ page }) => {
      authToken = await getAuthToken(page, 'admin');
    });

    test('GET /api/courses - should return courses list', async ({ page }) => {
      const response = await page.request.get('/api/courses', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data.courses)).toBeTruthy();
    });

    test('POST /api/courses - should create new course', async ({ page }) => {
      const courseData = {
        title: `API Test Course ${DataGenerators.randomString()}`,
        description: 'Course created via API test',
        language: 'English',
        level: 'Beginner'
      };

      const response = await page.request.post('/api/courses', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: courseData
      });

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.course.title).toBe(courseData.title);
      expect(data.course.description).toBe(courseData.description);
    });

    test('GET /api/courses/[id] - should return specific course', async ({ page }) => {
      // First create a course
      const courseData = {
        title: `API Test Course ${DataGenerators.randomString()}`,
        description: 'Course for GET test',
        language: 'English',
        level: 'Beginner'
      };

      const createResponse = await page.request.post('/api/courses', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: courseData
      });

      const createdCourse = await createResponse.json();
      const courseId = createdCourse.course.id;

      // Then get the course
      const getResponse = await page.request.get(`/api/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(getResponse.ok()).toBeTruthy();
      
      const data = await getResponse.json();
      expect(data.course.id).toBe(courseId);
      expect(data.course.title).toBe(courseData.title);
    });

    test('PUT /api/courses/[id] - should update course', async ({ page }) => {
      // First create a course
      const courseData = {
        title: `API Test Course ${DataGenerators.randomString()}`,
        description: 'Course for UPDATE test',
        language: 'English',
        level: 'Beginner'
      };

      const createResponse = await page.request.post('/api/courses', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: courseData
      });

      const createdCourse = await createResponse.json();
      const courseId = createdCourse.course.id;

      // Update the course
      const updateData = {
        title: 'Updated Course Title',
        description: 'Updated description'
      };

      const updateResponse = await page.request.put(`/api/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: updateData
      });

      expect(updateResponse.ok()).toBeTruthy();
      
      const data = await updateResponse.json();
      expect(data.course.title).toBe(updateData.title);
      expect(data.course.description).toBe(updateData.description);
    });

    test('DELETE /api/courses/[id] - should delete course', async ({ page }) => {
      // First create a course
      const courseData = {
        title: `API Test Course ${DataGenerators.randomString()}`,
        description: 'Course for DELETE test',
        language: 'English',
        level: 'Beginner'
      };

      const createResponse = await page.request.post('/api/courses', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: courseData
      });

      const createdCourse = await createResponse.json();
      const courseId = createdCourse.course.id;

      // Delete the course
      const deleteResponse = await page.request.delete(`/api/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(deleteResponse.ok()).toBeTruthy();

      // Verify course is deleted
      const getResponse = await page.request.get(`/api/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe('Activities API', () => {
    test.beforeEach(async ({ page }) => {
      authToken = await getAuthToken(page, 'student');
    });

    test('GET /api/activities - should return activities list', async ({ page }) => {
      const response = await page.request.get('/api/activities', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data.activities)).toBeTruthy();
    });

    test('GET /api/activities?level=1 - should filter activities by level', async ({ page }) => {
      const response = await page.request.get('/api/activities?level=1', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data.activities)).toBeTruthy();
      
      // All activities should be level 1
      data.activities.forEach((activity: { level: number }) => {
        expect(activity.level).toBe(1);
      });
    });

    test('GET /api/activities/[id] - should return specific activity', async ({ page }) => {
      // First get list of activities
      const listResponse = await page.request.get('/api/activities', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const listData = await listResponse.json();
      
      if (listData.activities.length > 0) {
        const activityId = listData.activities[0].id;

        // Get specific activity
        const response = await page.request.get(`/api/activities/${activityId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data.activity.id).toBe(activityId);
      }
    });

    test('POST /api/activities/[id]/complete - should complete activity', async ({ page }) => {
      // First get an activity
      const listResponse = await page.request.get('/api/activities', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const listData = await listResponse.json();
      
      if (listData.activities.length > 0) {
        const activityId = listData.activities[0].id;

        // Complete the activity
        const completeResponse = await page.request.post(`/api/activities/${activityId}/complete`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          data: {
            answers: ['answer1', 'answer2'],
            score: 85,
            timeSpent: 120
          }
        });

        expect(completeResponse.ok()).toBeTruthy();
        
        const data = await completeResponse.json();
        expect(data.completed).toBeTruthy();
        expect(data.score).toBe(85);
      }
    });
  });

  test.describe('User Progress API', () => {
    test.beforeEach(async ({ page }) => {
      authToken = await getAuthToken(page, 'student');
    });

    test('GET /api/user/progress - should return user progress', async ({ page }) => {
      const response = await page.request.get('/api/user/progress', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('lives');
      expect(data).toHaveProperty('points');
      expect(data).toHaveProperty('streak');
      expect(data).toHaveProperty('level');
    });

    test('GET /api/user/activities - should return user activity history', async ({ page }) => {
      const response = await page.request.get('/api/user/activities', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data.activities)).toBeTruthy();
    });

    test('GET /api/user/weekly-activity - should return weekly activity data', async ({ page }) => {
      const response = await page.request.get('/api/user/weekly-activity', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data.weeklyActivity)).toBeTruthy();
      expect(data.weeklyActivity).toHaveLength(7); // 7 days
    });
  });

  test.describe('Video Call API', () => {
    test.beforeEach(async ({ page }) => {
      authToken = await getAuthToken(page, 'teacher');
    });

    test('POST /api/video-call/create - should create video call room', async ({ page }) => {
      const callData = {
        studentId: 'student-id',
        scheduledTime: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      };

      const response = await page.request.post('/api/video-call/create', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: callData
      });

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('roomId');
      expect(data).toHaveProperty('videoCall');
    });

    test('GET /api/video-call/[roomId] - should return video call details', async ({ page }) => {
      // First create a video call
      const callData = {
        studentId: 'student-id',
        scheduledTime: new Date(Date.now() + 3600000).toISOString()
      };

      const createResponse = await page.request.post('/api/video-call/create', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: callData
      });

      const createData = await createResponse.json();
      const roomId = createData.roomId;

      // Get video call details
      const getResponse = await page.request.get(`/api/video-call/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(getResponse.ok()).toBeTruthy();
      
      const data = await getResponse.json();
      expect(data.videoCall.roomId).toBe(roomId);
    });

    test('POST /api/video-call/[roomId]/join - should join video call', async ({ page }) => {
      // Create a video call first
      const callData = {
        studentId: 'student-id',
        scheduledTime: new Date(Date.now() + 3600000).toISOString()
      };

      const createResponse = await page.request.post('/api/video-call/create', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: callData
      });

      const createData = await createResponse.json();
      const roomId = createData.roomId;

      // Join the call
      const joinResponse = await page.request.post(`/api/video-call/${roomId}/join`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(joinResponse.ok()).toBeTruthy();
      
      const data = await joinResponse.json();
      expect(data.joined).toBeTruthy();
    });

    test('POST /api/video-call/[roomId]/end - should end video call', async ({ page }) => {
      // Create and join a video call first
      const callData = {
        studentId: 'student-id',
        scheduledTime: new Date(Date.now() + 3600000).toISOString()
      };

      const createResponse = await page.request.post('/api/video-call/create', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: callData
      });

      const createData = await createResponse.json();
      const roomId = createData.roomId;

      // End the call
      const endResponse = await page.request.post(`/api/video-call/${roomId}/end`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          duration: 1800 // 30 minutes
        }
      });

      expect(endResponse.ok()).toBeTruthy();
      
      const data = await endResponse.json();
      expect(data.ended).toBeTruthy();
    });
  });

  test.describe('Chat API', () => {
    test.beforeEach(async ({ page }) => {
      authToken = await getAuthToken(page, 'teacher');
    });

    test('GET /api/chat/[roomId] - should return chat messages', async ({ page }) => {
      const roomId = 'test-room-id';

      const response = await page.request.get(`/api/chat/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data.messages)).toBeTruthy();
    });

    test('POST /api/chat/[roomId] - should send chat message', async ({ page }) => {
      const roomId = 'test-room-id';
      const messageData = {
        content: 'Hello from API test',
        type: 'TEXT'
      };

      const response = await page.request.post(`/api/chat/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: messageData
      });

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.message.content).toBe(messageData.content);
      expect(data.message.type).toBe(messageData.type);
    });
  });

  test.describe('Products API', () => {
    test('GET /api/products - should return products list', async ({ page }) => {
      const response = await page.request.get('/api/products');

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data.products)).toBeTruthy();
    });

    test('GET /api/products/[id] - should return specific product', async ({ page }) => {
      // First get list of products
      const listResponse = await page.request.get('/api/products');
      const listData = await listResponse.json();
      
      if (listData.products.length > 0) {
        const productId = listData.products[0].id;

        // Get specific product
        const response = await page.request.get(`/api/products/${productId}`);

        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data.product.id).toBe(productId);
      }
    });

    test('GET /api/products?category=courses - should filter products by category', async ({ page }) => {
      const response = await page.request.get('/api/products?category=courses');

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data.products)).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('should return 401 for unauthorized requests', async ({ page }) => {
      const response = await page.request.get('/api/courses');

      expect(response.status()).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('should return 404 for non-existent resources', async ({ page }) => {
      authToken = await getAuthToken(page, 'admin');

      const response = await page.request.get('/api/courses/non-existent-id', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status()).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('should return 400 for invalid request data', async ({ page }) => {
      authToken = await getAuthToken(page, 'admin');

      const response = await page.request.post('/api/courses', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          // Missing required fields
          description: 'Course without title'
        }
      });

      expect(response.status()).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('should return 403 for insufficient permissions', async ({ page }) => {
      // Login as student
      authToken = await getAuthToken(page, 'student');

      // Try to create course (admin only)
      const response = await page.request.post('/api/courses', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          title: 'Unauthorized Course',
          description: 'This should fail',
          language: 'English',
          level: 'Beginner'
        }
      });

      expect(response.status()).toBe(403);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle rate limiting', async ({ page }) => {
      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          page.request.post('/api/auth/signin', {
            data: {
              email: 'invalid@test.com',
              password: 'wrongpassword'
            }
          })
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
