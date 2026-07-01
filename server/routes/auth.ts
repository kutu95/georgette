import { Router, type Request, type Response } from "express";
import {
  clearSessionCookie,
  getAuthStatus,
  isAuthEnabled,
  setSessionCookie,
  verifyAdminPassword,
} from "../auth.js";

function sendError(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

export const authRouter = Router();

authRouter.get("/status", (req, res) => {
  res.json(getAuthStatus(req));
});

authRouter.post("/login", (req, res) => {
  if (!isAuthEnabled()) {
    res.json(getAuthStatus(req));
    return;
  }

  const status = getAuthStatus(req);
  if (!status.required) {
    res.json(status);
    return;
  }

  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!verifyAdminPassword(password)) {
    sendError(res, 401, "Incorrect password");
    return;
  }

  setSessionCookie(res);
  res.json({
    ...getAuthStatus(req),
    authenticated: true,
  });
});

authRouter.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json(getAuthStatus(req));
});
