import { 
  PrismaClient, 
  UserRole, 
  ClientStatus, 
  NotificationMethod,
  DurationUnit,
  SubscriptionStatus,
  PaymentStatus,
  PaymentMethod
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Super Admin User
  const superAdminPassword = await bcrypt.hash('admin123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@duetap.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@duetap.com',
      password: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
      status: 'active',
    },
  });
  console.log('✅ Super Admin created:', superAdmin.email);

  // Create Sample Client User
  const clientPassword = await bcrypt.hash('client123', 12);
  const clientUser = await prisma.user.upsert({
    where: { email: 'demo@business.com' },
    update: {},
    create: {
      name: 'Demo Business Owner',
      email: 'demo@business.com',
      phone: '+1234567890',
      password: clientPassword,
      role: UserRole.CLIENT,
      status: 'active',
    },
  });
  console.log('✅ Client User created:', clientUser.email);

  // Create Client Profile
  const client = await prisma.client.upsert({
    where: { userId: clientUser.id },
    update: {},
    create: {
      userId: clientUser.id,
      businessName: 'Demo Business Inc.',
      description: 'A sample business for demonstration',
      status: ClientStatus.active,
    },
  });
  console.log('✅ Client Profile created:', client.businessName);

  // Create Sample Templates
  const monthlyTemplate = await prisma.template.create({
    data: {
      clientId: client.id,
      name: 'Monthly Subscription',
      title: 'Monthly Service Payment Due',
      body: 'Hi {{name}}, your monthly payment of ₹{{amount}} for {{service}} is due on {{due_date}}. Please pay to continue your service.',
      recurringDuration: 1,
      durationUnit: DurationUnit.MONTHS,
      notificationMethod: NotificationMethod.WHATSAPP,
      paymentMethod: PaymentMethod.RAZORPAY,
      defaultAmount: 1500,
      isActive: true,
    },
  });

  const reminderTemplate = await prisma.template.create({
    data: {
      clientId: client.id,
      name: 'Payment Reminder',
      title: 'Payment Reminder - Overdue',
      body: 'Dear {{name}}, this is a reminder that your payment of ₹{{amount}} is overdue. Please make the payment immediately to avoid service interruption.',
      recurringDuration: 1,
      durationUnit: DurationUnit.WEEKS,
      notificationMethod: NotificationMethod.EMAIL,
      paymentMethod: PaymentMethod.STRIPE,
      defaultAmount: 2000,
      isActive: true,
    },
  });

  console.log('✅ Templates created:', monthlyTemplate.name, 'and', reminderTemplate.name);

  // Create Sample End Users
  const endUsers = [];
  const endUserData = [
    {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567891'
    },
    {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+1234567892'
    },
    {
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      phone: '+1234567893'
    },
    {
      name: 'Alice Brown',
      email: 'alice.brown@example.com',
      phone: '+1234567894'
    }
  ];

  for (const userData of endUserData) {
    const endUser = await prisma.endUser.upsert({
      where: {
        clientId_email: {
          clientId: client.id,
          email: userData.email
        }
      },
      update: {},
      create: {
        clientId: client.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
      },
    });
    endUsers.push(endUser);
  }
  console.log('✅ End Users created:', endUsers.length, 'users');

  // Create Sample Subscriptions
  const subscriptions = [];
  for (let i = 0; i < endUsers.length; i++) {
    const endUser = endUsers[i];
    const template = i % 2 === 0 ? monthlyTemplate : reminderTemplate;
    
    const subscription = await prisma.subscription.create({
      data: {
        clientId: client.id,
        endUserId: endUser.id,
        templateId: template.id,
        amount: 1500 + (i * 500), // Different amounts: 1500, 2000, 2500, 3000
        status: i === 3 ? SubscriptionStatus.PAUSED : SubscriptionStatus.ACTIVE,
        nextDueDate: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days from now
      },
    });
    subscriptions.push(subscription);
  }
  console.log('✅ Subscriptions created:', subscriptions.length, 'subscriptions');

  // Create Sample Payments
  const payments = [];
  for (let i = 0; i < subscriptions.length; i++) {
    const subscription = subscriptions[i];
    const endUser = endUsers[i];

    // Create a few payments for each subscription (historical data)
    const paymentStatuses = [
      PaymentStatus.PAID,
      PaymentStatus.PAID,
      i === 2 ? PaymentStatus.FAILED : PaymentStatus.PENDING, // One failed payment for user 2
      PaymentStatus.PENDING
    ];

    for (let j = 0; j < paymentStatuses.length; j++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() - (3 - j)); // Past 3 months and current
      
      const payment = await prisma.payment.create({
        data: {
          clientId: client.id,
          endUserId: endUser.id,
          subscriptionId: subscription.id,
          amount: subscription.amount,
          status: paymentStatuses[j],
          dueDate: dueDate,
          paidDate: paymentStatuses[j] === PaymentStatus.PAID ? dueDate : null,
          paymentMethod: j % 2 === 0 ? PaymentMethod.RAZORPAY : PaymentMethod.STRIPE,
          gatewayPaymentId: paymentStatuses[j] === PaymentStatus.PAID ? `pay_${Math.random().toString(36).substr(2, 9)}` : null,
          notificationsSent: j === 3 ? 2 : 1, // Current month payment has more reminders
          lastNotificationSent: new Date(),
        },
      });
      payments.push(payment);
    }
  }
  console.log('✅ Payments created:', payments.length, 'payment records');

  // Create Client Settings (API keys are encrypted in the service layer)
  const clientSettings = await prisma.clientSettings.upsert({
    where: { clientId: client.id },
    update: {},
    create: {
      clientId: client.id,
      whatsappApiKey: 'demo_whatsapp_key_encrypted',
      whatsappBusinessPhone: '+1234567890',
      emailSmtpHost: 'smtp.gmail.com',
      emailSmtpPort: 587,
      emailSmtpUser: 'demo@business.com',
      emailSmtpPassword: 'demo_email_password_encrypted',
      emailFromAddress: 'demo@business.com',
      razorpayKeyId: 'demo_razorpay_key_id',
      razorpayKeySecret: 'demo_razorpay_secret_encrypted',
      stripePublishableKey: 'pk_test_demo_stripe_key',
      stripeSecretKey: 'sk_test_demo_stripe_secret_encrypted',
    },
  });
  console.log('✅ Client Settings created');

  // Create some notification logs
  const notificationLogs = [];
  for (let i = 0; i < 10; i++) {
    const randomPayment = payments[Math.floor(Math.random() * payments.length)];
    const endUser = endUsers.find(u => u.id === randomPayment.endUserId);
    const notificationLog = await prisma.notificationLog.create({
      data: {
        clientId: client.id,
        endUserId: randomPayment.endUserId,
        paymentId: randomPayment.id,
        method: i % 2 === 0 ? NotificationMethod.WHATSAPP : NotificationMethod.EMAIL,
        recipient: i % 2 === 0 ? endUser.phone! : endUser.email!,
        subject: 'Payment Reminder',
        content: i % 2 === 0 ? 'WhatsApp payment reminder sent' : 'Email payment reminder sent',
        status: Math.random() > 0.1 ? 'sent' : 'failed',
        errorMessage: Math.random() > 0.9 ? 'Network timeout' : null,
      },
    });
    notificationLogs.push(notificationLog);
  }
  console.log('✅ Notification Logs created:', notificationLogs.length, 'logs');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('Super Admin: admin@duetap.com / admin123');
  console.log('Client: demo@business.com / client123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
