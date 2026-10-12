// every service that authenticates puts the signed in user and their session on the request
declare global {
  namespace Express {
    interface Request {
      user?: unknown
      sessionId?: string
    }
  }
}

export {}
