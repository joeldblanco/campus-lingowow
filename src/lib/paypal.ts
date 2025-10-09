import { Client, Environment, OrdersController } from '@paypal/paypal-server-sdk'

// Configuración del cliente PayPal
const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID!,
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET!,
  },
  environment:
    process.env.PAYPAL_MODE === 'live' ? Environment.Production : Environment.Sandbox,
})

// Obtener el controlador de órdenes
const ordersController = new OrdersController(paypalClient)

export { paypalClient, ordersController }
