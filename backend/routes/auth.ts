import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/users';
import { signToken, verifyToken } from '../middleware/auth';

const router = Router();

function toPublicUser(user: { id: string; username: string }) {
  return { id: user.id, username: user.username };
}

// POST /api/auth/register — create account
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请输入用户名和密码' });
    }
    const name = String(username).trim();
    if (name.length < 3 || name.length > 50) {
      return res.status(400).json({ success: false, message: '用户名长度需在 3-50 个字符之间' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: '密码至少 6 位' });
    }

    const existing = await userRepository.findByUsername(name);
    if (existing) {
      return res.status(409).json({ success: false, message: '该用户名已被注册' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await userRepository.create(name, passwordHash);
    const token = signToken({ userId: user.id, username: user.username });

    res.status(201).json({ success: true, data: { token, user: toPublicUser(user) } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: '注册失败，请稍后重试' });
  }
});

// POST /api/auth/login — sign in
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请输入用户名和密码' });
    }

    const user = await userRepository.findByUsername(String(username).trim());
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = signToken({ userId: user.id, username: user.username });
    res.json({ success: true, data: { token, user: toPublicUser(user) } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: '登录失败，请稍后重试' });
  }
});

// GET /api/auth/me — validate token
router.get('/me', async (req: Request, res: Response) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return res.status(401).json({ success: false, message: '未登录或登录已过期' });
  }
  const user = await userRepository.findById(payload.userId);
  if (!user) {
    return res.status(401).json({ success: false, message: '用户不存在' });
  }
  res.json({ success: true, data: toPublicUser(user) });
});

export default router;
