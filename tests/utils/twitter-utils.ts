/**
 * Error type to mock
 */
export enum TwitterMockErrorType {
  RESPONSE_ERROR = 'response',
  REQUEST_ERROR = 'request',
  PARTIAL_RESPONSE_ERROR = 'partial',
  NETWORK_ERROR = 'network',
}

/**
 * Create a mock error response from Twitter API
 * @param code Twitter error code
 * @param message Error message
 * @param errorType Type of error to mock (default: response)
 * @param title Optional title for V2 errors
 * @param type Optional type for V2 errors
 * @param detail Optional detail for V2 errors
 * @returns Mock Twitter API error
 */
export function createMockTwitterError(
  code: number,
  message: string,
  errorType: TwitterMockErrorType = TwitterMockErrorType.RESPONSE_ERROR,
  title?: string,
  type?: string,
  detail?: string,
): any {
  // Base properties for all error types
  const mockError: any = {
    message,
  };

  // Add properties based on error type
  switch (errorType) {
    case TwitterMockErrorType.RESPONSE_ERROR:
      // Mock ApiResponseError
      mockError.name = 'ApiResponseError';
      mockError.code = code;
      mockError.data = { errors: [{ code, message }] };
      mockError.errors = [{ code, message, title, type, detail }];

      // Add special flags for specific error codes
      if (code === 88) {
        mockError.rateLimitError = true;
      }

      if (code === 89 || code === 32 || code === 87) {
        mockError.isAuthError = true;
      }
      break;

    case TwitterMockErrorType.REQUEST_ERROR:
      // Mock ApiRequestError
      mockError.name = 'ApiRequestError';
      mockError.requestError = {
        message,
        code: 'NETWORK_ERROR',
      };
      break;

    case TwitterMockErrorType.PARTIAL_RESPONSE_ERROR:
      // Mock ApiPartialResponseError
      mockError.name = 'ApiPartialResponseError';
      mockError.rawContent = message;
      mockError.responseError = {
        message,
      };
      mockError.request = {};
      mockError.response = {};
      break;

    case TwitterMockErrorType.NETWORK_ERROR:
      // Mock network error
      mockError.code = 'NETWORK_ERROR';
      break;
  }

  return mockError;
}
