/**
 * Validates request segments against Zod schemas and exposes the parsed
 * (coerced, defaulted) values on `req.validated`. Express 5 makes `req.query`
 * read-only, so parsed values are not written back onto the request.
 */
export const validate =
  ({ body, query, params } = {}) =>
  (req, _res, next) => {
    req.validated = {
      body: body ? body.parse(req.body ?? {}) : req.body,
      query: query ? query.parse(req.query) : req.query,
      params: params ? params.parse(req.params) : req.params,
    };
    next();
  };
