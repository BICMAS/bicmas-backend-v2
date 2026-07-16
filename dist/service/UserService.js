"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UserService = void 0;
var _UserModel = require("../models/UserModel.js");
var _OrganizationModel = require("../models/OrganizationModel.js");
var _bcryptjs = _interopRequireDefault(require("bcryptjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class UserService {
  static sanitizeUser(user) {
    if (!user) return user;
    // Never return hashed password
    const {
      password,
      ...rest
    } = user;
    return rest;
  }
  static async getAllUsers(requester) {
    console.log('[SERVICE GET USERS] Role:', requester.userRole, 'OrgId:', requester.orgId);
    if (requester.userRole === 'SUPER_ADMIN') {
      const users = await _UserModel.UserModel.findAll(requester.userRole, requester.orgId);
      console.log('[SERVICE SUPER ADMIN] Returned', users.length, 'users');
      return users;
    } else if (requester.userRole === 'HR_MANAGER') {
      if (!requester.orgId) throw new Error('HR must be in an organization');
      const users = await _UserModel.UserModel.findByOrgId(requester.orgId);
      console.log('[SERVICE HR] Returned', users.length, 'org users');
      return users;
    } else {
      throw new Error('Insufficient role to view users');
    }
  }
  static async getCurrentOrgUsers(requester) {
    const timestamp = new Date().toISOString();
    console.log(`[ORG SVC START] ${timestamp} - Role: ${requester.userRole}, orgId: ${requester.orgId}`);
    if (requester.userRole !== 'HR_MANAGER' && requester.userRole !== 'SUPER_ADMIN') {
      console.log(`[ORG SVC FAIL] ${timestamp} - Insufficient role`);
      throw new Error('Access denied—only HR and super admin can view org users');
    }
    if (!requester.orgId) {
      console.log(`[ORG SVC FAIL] ${timestamp} - No orgId`);
      throw new Error('No organization found for user');
    }
    const users = await _UserModel.UserModel.findByOrgId(requester.orgId);
    console.log(`[ORG SVC END] ${timestamp} - Found ${users.length} users for org ${requester.orgId}`);
    if (users.length === 0) {
      console.log(`[ORG SVC NOTE] ${timestamp} - Empty org, returning []`);
    }
    return users;
  }
  static async getUser(id, requester) {
    const user = await _UserModel.UserModel.findById(id);
    if (!user) throw new Error('User not found');
    if (requester.userRole === 'HR_MANAGER') {
      if (!requester.orgId || user.orgId !== requester.orgId) {
        throw new Error('Access denied');
      }
    } else if (requester.userRole !== 'SUPER_ADMIN') {
      throw new Error('Insufficient role to view users');
    }
    return UserService.sanitizeUser(user);
  }
  static async createUser(data, creator) {
    const {
      fullName,
      email,
      phoneNumber,
      department,
      userRole,
      groupId,
      password,
      username
    } = data; // Include username in destructuring
    if (!fullName || !email || !userRole || !department || !password) {
      throw new Error('Required fields: fullName, email, userRole, department, password');
    }
    let orgId = null;
    if (creator.userRole === 'SUPER_ADMIN') {
      if (userRole === 'HR_MANAGER') {
        const org = await _OrganizationModel.OrganizationModel.create({
          name: `Org for ${fullName}`,
          createdBy: creator.id
        });
        orgId = org.id;
      }
    } else if (creator.userRole === 'HR_MANAGER') {
      if (!creator.orgId) throw new Error('HR must be in an organization');
      orgId = creator.orgId;
      if (userRole !== 'LEARNER') throw new Error('HR can only create learners');
    } else {
      throw new Error('Insufficient role to create users');
    }

    // FIXED: Check email only for duplicates (DB handles username unique)
    const existing = await _UserModel.UserModel.findByEmail(email);
    if (existing) throw new Error('Email already exists');
    const hashedPassword = await _bcryptjs.default.hash(password, 12);
    const user = await _UserModel.UserModel.create({
      fullName,
      email,
      username,
      // Include if provided (DB enforces unique)
      phoneNumber: phoneNumber || null,
      department,
      userRole,
      password: hashedPassword,
      orgId,
      status: 'ACTIVE',
      authProvider: 'LOCAL'
    });
    if (groupId) {
      // await GroupMemberModel.create({ groupId, userId: user.id, role: 'MEMBER' });
    }
    return {
      ...user,
      password: undefined
    };
  }
  static async updateUser(id, updates, requester) {
    if (!id) throw new Error('User ID required');
    if (!updates || typeof updates !== 'object') throw new Error('Updates payload required');
    const existing = await _UserModel.UserModel.findById(id);
    if (!existing) throw new Error('User not found');

    // HR can only manage users within their org and should not be able to escalate roles
    const requesterRole = requester?.userRole;
    const requesterOrgId = requester?.orgId;
    if (requesterRole === 'HR_MANAGER') {
      if (!requesterOrgId) throw new Error('HR must be in an organization');
      if (existing.orgId !== requesterOrgId) throw new Error('Access denied');
    } else if (!requesterRole || requesterRole !== 'SUPER_ADMIN') {
      throw new Error('Insufficient role to update users');
    }
    const allowedFields = requesterRole === 'HR_MANAGER' ? ['fullName', 'email', 'phoneNumber', 'department', 'username', 'groupId', 'status', 'authProvider', 'points'] : ['fullName', 'email', 'phoneNumber', 'department', 'userRole', 'username', 'orgId', 'groupId', 'status', 'authProvider', 'points'];
    const data = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        data[key] = updates[key];
      }
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'password')) {
      if (!updates.password) throw new Error('Password cannot be empty');
      data.password = await _bcryptjs.default.hash(updates.password, 12);
    }
    const updated = await _UserModel.UserModel.update(id, data);
    return UserService.sanitizeUser(updated);
  }
  static async blockUser(id) {
    const existing = await _UserModel.UserModel.findById(id);
    if (!existing) throw new Error('User not found');
    const updated = await _UserModel.UserModel.update(id, {
      status: 'BLOCKED'
    });
    return UserService.sanitizeUser(updated);
  }
  static async unblockUser(id) {
    const existing = await _UserModel.UserModel.findById(id);
    if (!existing) throw new Error('User not found');
    const updated = await _UserModel.UserModel.update(id, {
      status: 'ACTIVE'
    });
    return UserService.sanitizeUser(updated);
  }
  static async deleteUser(id, requester) {
    const existing = await _UserModel.UserModel.findById(id);
    if (!existing) throw new Error('User not found');
    if (!requester?.userRole) throw new Error('Insufficient role to delete users');
    if (existing.userRole === 'SUPER_ADMIN') throw new Error('Cannot delete SUPER_ADMIN');
    if (requester.userRole === 'HR_MANAGER') {
      if (!requester.orgId) throw new Error('HR must be in an organization');
      if (existing.orgId !== requester.orgId) throw new Error('Access denied');
    } else if (requester.userRole !== 'SUPER_ADMIN') {
      throw new Error('Insufficient role to delete users');
    }
    await _UserModel.UserModel.deleteById(id);
    return UserService.sanitizeUser(existing);
  }
  static async bulkUpload(rows, creator) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('CSV data required');
    }
    if (creator.userRole !== 'SUPER_ADMIN' && creator.userRole !== 'HR_MANAGER') {
      throw new Error('Insufficient role to bulk upload users');
    }
    const usersToCreate = [];
    for (const [index, row] of rows.entries()) {
      const fullName = row.fullName || row.full_name || row.name;
      const email = row.email;
      const password = row.password || row.temporaryPassword;
      const department = row.department;
      const userRole = row.userRole || row.user_role || 'LEARNER';
      const username = row.username || null;
      const phoneNumber = row.phoneNumber || row.phone_number || null;
      if (!fullName || !email || !password || !department) {
        throw new Error(`Row ${index + 1}: fullName, email, password, and department are required`);
      }
      if (creator.userRole === 'HR_MANAGER' && userRole !== 'LEARNER') {
        throw new Error(`Row ${index + 1}: HR can only create learners`);
      }
      const existing = await _UserModel.UserModel.findByEmail(email);
      if (existing) {
        continue;
      }
      usersToCreate.push({
        fullName,
        email,
        username,
        phoneNumber,
        department,
        userRole,
        password: await _bcryptjs.default.hash(password, 12),
        orgId: creator.userRole === 'HR_MANAGER' ? creator.orgId : row.orgId || null,
        status: 'ACTIVE',
        authProvider: 'LOCAL'
      });
    }
    if (usersToCreate.length === 0) {
      return {
        created: 0,
        skipped: rows.length,
        message: 'No new users to create'
      };
    }
    const result = await _UserModel.UserModel.bulkCreate(usersToCreate);
    return {
      created: result.count,
      skipped: rows.length - result.count
    };
  }
}
exports.UserService = UserService;