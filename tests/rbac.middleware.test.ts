import { NextFunction, Request, Response } from 'express';
import { requireRoles } from '../src/common/middleware/rbac.middleware';
import { Role } from '../src/generated/prisma/enums';

describe('RBAC middleware', () => {
  it('returns 401 when user is missing', () => {
    const middleware = requireRoles(Role.ADMIN);
    const req = {} as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    const next = jest.fn() as NextFunction;

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when role is not permitted', () => {
    const middleware = requireRoles(Role.ADMIN);
    const req = { user: { role: Role.ANALYST } } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    const next = jest.fn() as NextFunction;

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when role is permitted', () => {
    const middleware = requireRoles(Role.ADMIN, Role.ANALYST);
    const req = { user: { role: Role.ADMIN } } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    const next = jest.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });
});
