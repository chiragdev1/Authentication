import type {Response} from 'express'

export class ApiError extends Error {
  statusCode: number

  constructor(statusCode: number , message: string = "something went wrong") {
    super(message)
    this.statusCode = statusCode
    Error.captureStackTrace(this, this.constructor)
  }

  static badRequest(message: string = "Bad Request") {
    return new ApiError(400, message)
  }

  static unauthorized(message = "unauthorized"){
    return new ApiError(401, message)
  }

  static forbidden(message="Forbidden"){
    return new ApiError(403, message)
  }

  static notFound(message="Not Found"){
    return new ApiError(404, message)
  }

  static conflict(message="conflict"){
    return new ApiError(409, message)
  }

  static internal(message="Internal Server Error"){
    return new ApiError(500, message)
  }
}