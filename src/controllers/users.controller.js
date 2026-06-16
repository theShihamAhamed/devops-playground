import logger from '#config/logger.js';
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from '#services/users.service.js';
import { formatValidationErrors } from '#utils/format.js';
import z from 'zod';

const userUpdateSchema = z
  .object({
    name: z.string().min(2).max(255).trim().optional(),
    email: z.email().max(255).toLowerCase().trim().optional(),
    role: z.enum(['user', 'admin']).optional(),
  })
  .strict()
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const parseUserId = rawId => {
  const id = Number.parseInt(rawId, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const isAdmin = user => user?.role === 'admin';
const ownsProfile = (user, id) => Number(user?.id) === id;

export const fetchAllUsers = async (_req, res, next) => {
  try {
    const allUsers = await getAllUsers();
    res.status(200).json({ users: allUsers });
  } catch (e) {
    logger.error('Fetch all users controller error:', e);
    next(e);
  }
};

export const fetchUserById = async (req, res, next) => {
  try {
    const id = parseUserId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (!isAdmin(req.user) && !ownsProfile(req.user, id)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own profile',
      });
    }

    const user = await getUserById(id);
    res.status(200).json({ user });
  } catch (e) {
    logger.error('Fetch user by id controller error:', e);

    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    next(e);
  }
};

export const updateUserById = async (req, res, next) => {
  try {
    const id = parseUserId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (!isAdmin(req.user) && !ownsProfile(req.user, id)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own profile',
      });
    }

    const validationResult = userUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationErrors(validationResult.error),
      });
    }

    const updates = { ...validationResult.data };
    if (!isAdmin(req.user)) {
      delete updates.role;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: 'At least one permitted field must be provided',
      });
    }

    const updatedUser = await updateUser(id, updates);
    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (e) {
    logger.error('Update user by id controller error:', e);

    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    if (e.message === 'Email already exists') {
      return res.status(409).json({ error: 'Email already exists' });
    }

    next(e);
  }
};

export const deleteUserById = async (req, res, next) => {
  try {
    const id = parseUserId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const deletedUser = await deleteUser(id);
    res.status(200).json({
      message: 'User deleted successfully',
      user: deletedUser,
    });
  } catch (e) {
    logger.error('Delete user by id controller error:', e);

    if (e.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    next(e);
  }
};
