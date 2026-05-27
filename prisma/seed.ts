// SecureTeam - Database Seed Script
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SecureTeam database...');

  // Clean existing data (in order due to foreign keys)
  console.log('Cleaning existing data...');
  await db.auditLog.deleteMany();
  await db.unreadMessage.deleteMany();
  await db.threadReply.deleteMany();
  await db.message.deleteMany();
  await db.channelMember.deleteMany();
  await db.encryptionKey.deleteMany();
  await db.session.deleteMany();
  await db.channel.deleteMany();
  await db.taskLabel.deleteMany();
  await db.label.deleteMany();
  await db.taskActivity.deleteMany();
  await db.taskComment.deleteMany();
  await db.taskAttachment.deleteMany();
  await db.taskAssignment.deleteMany();
  await db.task.deleteMany();
  await db.callRecording.deleteMany();
  await db.callParticipant.deleteMany();
  await db.callRoom.deleteMany();
  await db.notification.deleteMany();
  await db.user.deleteMany();
  await db.role.deleteMany();

  // ============================================
  // 1. Create Roles
  // ============================================
  console.log('Creating roles...');

  const superAdminRole = await db.role.create({
    data: {
      name: 'SUPER_ADMIN',
      description: 'Full system access with all permissions',
      permissions: JSON.stringify({
        canManageUsers: true,
        canViewAllMessages: true,
        canManageChannels: true,
        canAudit: true,
        canExportData: true,
        canDeleteUsers: true,
        canManageRoles: true,
      }),
    },
  });

  const adminRole = await db.role.create({
    data: {
      name: 'ADMIN',
      description: 'Administrative access with most permissions',
      permissions: JSON.stringify({
        canManageUsers: true,
        canViewAllMessages: true,
        canManageChannels: true,
        canAudit: true,
        canExportData: true,
        canDeleteUsers: false,
        canManageRoles: false,
      }),
    },
  });

  const leaderRole = await db.role.create({
    data: {
      name: 'LEADER',
      description: 'Team leader with channel management',
      permissions: JSON.stringify({
        canManageUsers: false,
        canViewAllMessages: false,
        canManageChannels: true,
        canAudit: false,
        canExportData: false,
        canDeleteUsers: false,
        canManageRoles: false,
      }),
    },
  });

  const memberRole = await db.role.create({
    data: {
      name: 'MEMBER',
      description: 'Standard team member',
      permissions: JSON.stringify({
        canManageUsers: false,
        canViewAllMessages: false,
        canManageChannels: false,
        canAudit: false,
        canExportData: false,
        canDeleteUsers: false,
        canManageRoles: false,
      }),
    },
  });

  console.log(`  Created 4 roles`);

  // ============================================
  // 2. Create Users
  // ============================================
  console.log('Creating users...');

  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const memberPassword = await bcrypt.hash('Member@123456', 12);

  const superAdmin = await db.user.create({
    data: {
      email: 'admin@secureteam.com',
      passwordHash: adminPassword,
      name: 'Super Admin',
      roleId: superAdminRole.id,
      isEmailVerified: true,
      isActive: true,
      bio: 'System administrator with full access',
    },
  });

  const admin = await db.user.create({
    data: {
      email: 'admin2@secureteam.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      roleId: adminRole.id,
      isEmailVerified: true,
      isActive: true,
      bio: 'Administrative user',
    },
  });

  const leader = await db.user.create({
    data: {
      email: 'leader@secureteam.com',
      passwordHash: memberPassword,
      name: 'Team Leader',
      roleId: leaderRole.id,
      isEmailVerified: true,
      isActive: true,
      bio: 'Engineering team leader',
    },
  });

  const member1 = await db.user.create({
    data: {
      email: 'member1@secureteam.com',
      passwordHash: memberPassword,
      name: 'Alice Chen',
      roleId: memberRole.id,
      isEmailVerified: true,
      isActive: true,
      bio: 'Full-stack developer',
    },
  });

  const member2 = await db.user.create({
    data: {
      email: 'member2@secureteam.com',
      passwordHash: memberPassword,
      name: 'Bob Smith',
      roleId: memberRole.id,
      isEmailVerified: true,
      isActive: true,
      bio: 'Backend engineer',
    },
  });

  const member3 = await db.user.create({
    data: {
      email: 'member3@secureteam.com',
      passwordHash: memberPassword,
      name: 'Carol Wang',
      roleId: memberRole.id,
      isEmailVerified: true,
      isActive: true,
      bio: 'Frontend developer',
    },
  });

  const member4 = await db.user.create({
    data: {
      email: 'member4@secureteam.com',
      passwordHash: memberPassword,
      name: 'David Lee',
      roleId: memberRole.id,
      isEmailVerified: true,
      isActive: true,
      bio: 'DevOps engineer',
    },
  });

  const member5 = await db.user.create({
    data: {
      email: 'member5@secureteam.com',
      passwordHash: memberPassword,
      name: 'Eva Martinez',
      roleId: memberRole.id,
      isEmailVerified: false,
      isActive: true,
      bio: 'UI/UX designer',
    },
  });

  console.log(`  Created 8 users`);

  // ============================================
  // 3. Create Channels
  // ============================================
  console.log('Creating channels...');

  const generalChannel = await db.channel.create({
    data: {
      name: 'general',
      description: 'General discussion for everyone',
      type: 'public',
      ownerId: superAdmin.id,
    },
  });

  const randomChannel = await db.channel.create({
    data: {
      name: 'random',
      description: 'Random topics and fun stuff',
      type: 'public',
      ownerId: superAdmin.id,
    },
  });

  const engineeringChannel = await db.channel.create({
    data: {
      name: 'engineering',
      description: 'Engineering team discussions',
      type: 'public',
      ownerId: leader.id,
    },
  });

  const designChannel = await db.channel.create({
    data: {
      name: 'design',
      description: 'Design team workspace',
      type: 'private',
      ownerId: admin.id,
    },
  });

  // Direct message channels
  const dm1 = await db.channel.create({
    data: {
      name: 'DM: Alice & Bob',
      type: 'direct',
      ownerId: member1.id,
    },
  });

  const dm2 = await db.channel.create({
    data: {
      name: 'DM: Admin & Alice',
      type: 'direct',
      ownerId: superAdmin.id,
    },
  });

  const dm3 = await db.channel.create({
    data: {
      name: 'DM: Alice & Carol',
      type: 'direct',
      ownerId: member1.id,
    },
  });

  console.log(`  Created 7 channels`);

  // ============================================
  // 4. Add Channel Members
  // ============================================
  console.log('Adding channel members...');

  const allUsers = [superAdmin, admin, leader, member1, member2, member3, member4, member5];

  // Add all users to general
  for (const user of allUsers) {
    await db.channelMember.create({
      data: {
        userId: user.id,
        channelId: generalChannel.id,
        role: [superAdmin.id, admin.id].includes(user.id) ? 'admin' : 'member',
      },
    });
  }

  // Add all users to random
  for (const user of allUsers) {
    await db.channelMember.create({
      data: {
        userId: user.id,
        channelId: randomChannel.id,
        role: 'member',
      },
    });
  }

  // Add engineering team
  const engineeringMembers = [superAdmin, leader, member1, member2, member3, member4];
  for (const user of engineeringMembers) {
    await db.channelMember.create({
      data: {
        userId: user.id,
        channelId: engineeringChannel.id,
        role: [superAdmin.id, leader.id].includes(user.id) ? 'admin' : 'member',
      },
    });
  }

  // Add design team
  const designMembers = [admin, member3, member5];
  for (const user of designMembers) {
    await db.channelMember.create({
      data: {
        userId: user.id,
        channelId: designChannel.id,
        role: admin.id === user.id ? 'admin' : 'member',
      },
    });
  }

  // DM members
  await db.channelMember.create({ data: { userId: member1.id, channelId: dm1.id } });
  await db.channelMember.create({ data: { userId: member2.id, channelId: dm1.id } });
  await db.channelMember.create({ data: { userId: superAdmin.id, channelId: dm2.id } });
  await db.channelMember.create({ data: { userId: member1.id, channelId: dm2.id } });
  await db.channelMember.create({ data: { userId: member1.id, channelId: dm3.id } });
  await db.channelMember.create({ data: { userId: member3.id, channelId: dm3.id } });

  console.log(`  Added channel members`);

  // ============================================
  // 5. Create Sample Messages
  // ============================================
  console.log('Creating sample messages...');

  const messages = [
    {
      channelId: generalChannel.id,
      senderId: superAdmin.id,
      content: 'Welcome to SecureTeam! 🎉 This is our secure internal communication platform.',
      contentType: 'text',
    },
    {
      channelId: generalChannel.id,
      senderId: superAdmin.id,
      content: 'Please make sure to update your profile and set up two-factor authentication for enhanced security.',
      contentType: 'text',
    },
    {
      channelId: generalChannel.id,
      senderId: member1.id,
      content: 'Thanks for setting this up! Looking forward to using SecureTeam.',
      contentType: 'text',
    },
    {
      channelId: generalChannel.id,
      senderId: member2.id,
      content: 'The encryption features are really impressive. Great work on the security!',
      contentType: 'text',
    },
    {
      channelId: engineeringChannel.id,
      senderId: leader.id,
      content: 'Team standup reminder: Please post your updates by 10 AM every day.',
      contentType: 'text',
    },
    {
      channelId: engineeringChannel.id,
      senderId: member1.id,
      content: 'Working on the new API endpoints today. Should have the auth module done by EOD.',
      contentType: 'text',
    },
    {
      channelId: engineeringChannel.id,
      senderId: member2.id,
      content: 'I\'ll review the database schema changes this afternoon. Also setting up the CI pipeline.',
      contentType: 'text',
    },
    {
      channelId: engineeringChannel.id,
      senderId: member3.id,
      content: 'Component library update is ready for review. Check the design system channel for details.',
      contentType: 'text',
    },
    {
      channelId: randomChannel.id,
      senderId: member4.id,
      content: 'Anyone up for the team lunch on Friday? 🍕',
      contentType: 'text',
    },
    {
      channelId: randomChannel.id,
      senderId: member5.id,
      content: 'Count me in! How about that new Italian place downtown?',
      contentType: 'text',
    },
    {
      channelId: randomChannel.id,
      senderId: member1.id,
      content: 'Sounds great! I heard they have amazing pasta.',
      contentType: 'text',
    },
    {
      channelId: designChannel.id,
      senderId: member5.id,
      content: 'New mockups for the dashboard redesign are ready. Let me know your thoughts!',
      contentType: 'text',
    },
    {
      channelId: designChannel.id,
      senderId: admin.id,
      content: 'These look fantastic! Let\'s schedule a review session this week.',
      contentType: 'text',
    },
    {
      channelId: dm1.id,
      senderId: member1.id,
      content: 'Hey Bob, can you help me with the API integration?',
      contentType: 'text',
    },
    {
      channelId: dm1.id,
      senderId: member2.id,
      content: 'Sure! Let me check the docs and get back to you in an hour.',
      contentType: 'text',
    },
    {
      channelId: dm2.id,
      senderId: superAdmin.id,
      content: 'Alice, great work on the recent PR. Keep it up!',
      contentType: 'text',
    },
    {
      channelId: dm2.id,
      senderId: member1.id,
      content: 'Thank you! I learned a lot working on that feature.',
      contentType: 'text',
    },
  ];

  for (const msg of messages) {
    await db.message.create({
      data: {
        channelId: msg.channelId,
        senderId: msg.senderId,
        content: msg.content,
        contentType: msg.contentType,
      },
    });
  }

  console.log(`  Created ${messages.length} sample messages`);

  // ============================================
  // 6. Create Audit Logs
  // ============================================
  console.log('Creating audit logs...');

  await db.auditLog.createMany({
    data: [
      { userId: superAdmin.id, action: 'USER_CREATE', target: member1.email, details: 'Created user account' },
      { userId: superAdmin.id, action: 'USER_CREATE', target: member2.email, details: 'Created user account' },
      { userId: superAdmin.id, action: 'CHANNEL_CREATE', target: generalChannel.name, details: 'Created public channel' },
      { userId: superAdmin.id, action: 'CHANNEL_CREATE', target: engineeringChannel.name, details: 'Created engineering channel' },
      { userId: admin.id, action: 'CHANNEL_CREATE', target: designChannel.name, details: 'Created private design channel' },
      { userId: superAdmin.id, action: 'SYSTEM_SETTINGS', target: 'system', details: 'Initial system configuration' },
    ],
  });

  console.log('  Created 6 audit log entries');

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log('  - 4 roles: SUPER_ADMIN, ADMIN, LEADER, MEMBER');
  console.log('  - 8 users (admin@secureteam.com / Admin@123456)');
  console.log('  - 7 channels (4 public/private + 3 direct messages)');
  console.log('  - 17 sample messages');
  console.log('  - 6 audit log entries');
  console.log('\n🔑 Demo Credentials:');
  console.log('  Super Admin: admin@secureteam.com / Admin@123456');
  console.log('  Member:      member1@secureteam.com / Member@123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
