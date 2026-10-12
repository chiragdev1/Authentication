import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../../utils/api-error.js';

// body-parser marks its own errors with a type; these are the client's mistake, not the server's
const bodyParserErrors: Record<string, {status: number, message: string}> = {
  'entity.parse.failed': {status: 400, message: 'Request body is not valid JSON'},
  'entity.too.large': {status: 413, message: 'Request body is too large'},
  'encoding.unsupported': {status: 415, message: 'Unsupported request body encoding'},
  'charset.unsupported': {status: 415, message: 'Unsupported request body charset'},
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if(err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    })
  }

  const bodyParserError = typeof err === 'object' && err !== null && 'type' in err && typeof err.type === 'string' ? bodyParserErrors[err.type] : undefined
  if(bodyParserError) {
    return res.status(bodyParserError.status).json({
      success: false,
      message: bodyParserError.message
    })
  }

  console.error(err)
  return res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  })

}
