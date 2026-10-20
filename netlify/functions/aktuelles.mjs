// node_modules/@netlify/runtime-utils/dist/main.js
var getString = (input) => typeof input === "string" ? input : JSON.stringify(input);
var base64Decode = globalThis.Buffer ? (input) => Buffer.from(input, "base64").toString() : (input) => atob(input);
var base64Encode = globalThis.Buffer ? (input) => Buffer.from(getString(input)).toString("base64") : (input) => btoa(getString(input));
var getEnvironment = () => {
  const { Deno, Netlify: Netlify2, process: process2 } = globalThis;
  return Netlify2?.env ?? Deno?.env ?? {
    delete: (key) => delete process2?.env[key],
    get: (key) => process2?.env[key],
    has: (key) => Boolean(process2?.env[key]),
    set: (key, value) => {
      if (process2?.env) {
        process2.env[key] = value;
      }
    },
    toObject: () => process2?.env ?? {}
  };
};

// node_modules/@netlify/otel/dist/main.js
var GET_TRACER = "__netlify__getTracer";
var getTracer = (name, version) => {
  return globalThis[GET_TRACER]?.(name, version);
};
function withActiveSpan(tracer, name, optionsOrFn, contextOrFn, fn) {
  const func = typeof contextOrFn === "function" ? contextOrFn : typeof optionsOrFn === "function" ? optionsOrFn : fn;
  if (!func) {
    throw new Error("function to execute with active span is missing");
  }
  if (!tracer) {
    return func();
  }
  return tracer.withActiveSpan(name, optionsOrFn, contextOrFn, func);
}

// node_modules/@netlify/blobs/dist/chunk-QDL6ESI2.js
var getEnvironmentContext = () => {
  const context = globalThis.netlifyBlobsContext || getEnvironment().get("NETLIFY_BLOBS_CONTEXT");
  if (typeof context !== "string" || !context) {
    return {};
  }
  const data = base64Decode(context);
  try {
    return JSON.parse(data);
  } catch {
  }
  return {};
};
var MissingBlobsEnvironmentError = class extends Error {
  constructor(requiredProperties) {
    super(
      `The environment has not been configured to use Netlify Blobs. To use it manually, supply the following properties when creating a store: ${requiredProperties.join(
        ", "
      )}`
    );
    this.name = "MissingBlobsEnvironmentError";
  }
};
var BASE64_PREFIX = "b64;";
var METADATA_HEADER_INTERNAL = "x-amz-meta-user";
var METADATA_HEADER_EXTERNAL = "netlify-blobs-metadata";
var METADATA_MAX_SIZE = 2 * 1024;
var encodeMetadata = (metadata) => {
  if (!metadata) {
    return null;
  }
  const encodedObject = base64Encode(JSON.stringify(metadata));
  const payload = `b64;${encodedObject}`;
  if (METADATA_HEADER_EXTERNAL.length + payload.length > METADATA_MAX_SIZE) {
    throw new Error("Metadata object exceeds the maximum size");
  }
  return payload;
};
var decodeMetadata = (header) => {
  if (!header?.startsWith(BASE64_PREFIX)) {
    return {};
  }
  const encodedData = header.slice(BASE64_PREFIX.length);
  const decodedData = base64Decode(encodedData);
  const metadata = JSON.parse(decodedData);
  return metadata;
};
var getMetadataFromResponse = (response) => {
  if (!response.headers) {
    return {};
  }
  const value = response.headers.get(METADATA_HEADER_EXTERNAL) || response.headers.get(METADATA_HEADER_INTERNAL);
  try {
    return decodeMetadata(value);
  } catch {
    throw new Error(
      "An internal error occurred while trying to retrieve the metadata for an entry. Please try updating to the latest version of the Netlify Blobs client."
    );
  }
};
var NF_ERROR = "x-nf-error";
var NF_REQUEST_ID = "x-nf-request-id";
var DEPLOY_STORE_PREFIX = "deploy:";
var SITE_STORE_PREFIX = "site:";
var isDeniedWrite = (res, { method, storeName }) => (res.status === 401 || res.status === 403) && (method === "put" || method === "delete") && storeName !== void 0 && !storeName.startsWith(DEPLOY_STORE_PREFIX);
var blobsErrorMessage = (res, context, responseBody) => {
  let details = res.headers.get(NF_ERROR) || `${res.status} status code`;
  if (res.headers.has(NF_REQUEST_ID)) {
    details += `, ID: ${res.headers.get(NF_REQUEST_ID)}`;
  }
  if (isDeniedWrite(res, context)) {
    const storeName = context.storeName?.startsWith(SITE_STORE_PREFIX) ? context.storeName.slice(SITE_STORE_PREFIX.length) : context.storeName;
    const summary = `Netlify Blobs could not write to store '${storeName}' (${details}).`;
    if (context.edgeAccess) {
      return summary;
    }
    return `${summary} Builds and build plugins can only write to deploy-specific stores: use 'getDeployStore' instead of 'getStore', or pass a 'token' with write access to the store. If this code is not running in a build, check that the token and site ID are valid. See https://docs.netlify.com/build/data-and-storage/netlify-blobs/#deploy-specific-stores`;
  }
  let message = `Netlify Blobs has generated an internal error (${details})`;
  if (!res.headers.get(NF_ERROR) && responseBody) {
    message += `: ${responseBody}`;
  }
  return message;
};
var BlobsInternalError = class extends Error {
  constructor(res, context = {}, responseBody) {
    super(blobsErrorMessage(res, context, responseBody));
    this.name = "BlobsInternalError";
    this.status = res.status;
    this.responseBody = responseBody;
  }
};
var createBlobsInternalError = async (res, context = {}) => {
  const responseBody = await res.clone().text().catch(() => void 0);
  return new BlobsInternalError(res, context, responseBody);
};
var collectIterator = async (iterator) => {
  const result = [];
  for await (const item of iterator) {
    result.push(item);
  }
  return result;
};
function withSpan(span, name, fn) {
  if (span) return fn(span);
  return withActiveSpan(getTracer(), name, (span2) => {
    return fn(span2);
  });
}
var BlobsConsistencyError = class extends Error {
  constructor() {
    super(
      `Netlify Blobs has failed to perform a read using strong consistency because the environment has not been configured with a 'uncachedEdgeURL' property`
    );
    this.name = "BlobsConsistencyError";
  }
};
var REGION_AUTO = "auto";
var regions = {
  "us-east-1": true,
  "us-east-2": true,
  "eu-central-1": true,
  "ap-southeast-1": true,
  "ap-southeast-2": true
};
var isValidRegion = (input) => Object.keys(regions).includes(input);
var InvalidBlobsRegionError = class extends Error {
  constructor(region) {
    super(
      `${region} is not a supported Netlify Blobs region. Supported values are: ${Object.keys(regions).join(", ")}.`
    );
    this.name = "InvalidBlobsRegionError";
  }
};
var DEFAULT_RETRY_DELAY = getEnvironment().get("NODE_ENV") === "test" ? 1 : 5e3;
var MIN_RETRY_DELAY = 1e3;
var MAX_RETRY = 5;
var RATE_LIMIT_HEADER = "X-RateLimit-Reset";
var fetchAndRetry = async (fetch, url, options, attemptsLeft = MAX_RETRY, getRetryUrl) => {
  try {
    const res = await fetch(url, options);
    const isRetryable = res.status === 429 || res.status >= 500 || getRetryUrl !== void 0 && res.status === 403;
    if (attemptsLeft > 0 && isRetryable) {
      const delay = getDelay(res.headers.get(RATE_LIMIT_HEADER));
      await sleep(delay);
      const retryUrl = getRetryUrl ? await getRetryUrl() : url;
      return fetchAndRetry(fetch, retryUrl, options, attemptsLeft - 1, getRetryUrl);
    }
    return res;
  } catch (error) {
    if (attemptsLeft === 0) {
      throw error;
    }
    const delay = getDelay();
    await sleep(delay);
    const retryUrl = getRetryUrl ? await getRetryUrl() : url;
    return fetchAndRetry(fetch, retryUrl, options, attemptsLeft - 1, getRetryUrl);
  }
};
var getDelay = (rateLimitReset) => {
  if (!rateLimitReset) {
    return DEFAULT_RETRY_DELAY;
  }
  return Math.max(Number(rateLimitReset) * 1e3 - Date.now(), MIN_RETRY_DELAY);
};
var sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
var SIGNED_URL_ACCEPT_HEADER = "application/json;type=signed-url";
var Client = class {
  /**
   * Whether requests reach Blobs through the edge rather than the API. Only
   * runtime environments are given an edge URL.
   */
  get edgeAccess() {
    return this.edgeURL !== void 0;
  }
  constructor({ apiURL, consistency, edgeURL, fetch, region, siteID, token, uncachedEdgeURL }) {
    this.apiURL = apiURL;
    this.consistency = consistency ?? "eventual";
    this.edgeURL = edgeURL;
    this.fetch = fetch ?? globalThis.fetch;
    this.region = region;
    this.siteID = siteID;
    this.token = token;
    this.uncachedEdgeURL = uncachedEdgeURL;
    if (!this.fetch) {
      throw new Error(
        "Netlify Blobs could not find a `fetch` client in the global scope. You can either update your runtime to a version that includes `fetch` (like Node.js 18.0.0 or above), or you can supply your own implementation using the `fetch` property."
      );
    }
  }
  async getFinalRequest({
    consistency: opConsistency,
    key,
    metadata,
    method,
    parameters = {},
    storeName
  }) {
    const encodedMetadata = encodeMetadata(metadata);
    const consistency = opConsistency ?? this.consistency;
    let urlPath = `/${this.siteID}`;
    if (storeName) {
      urlPath += `/${storeName}`;
    }
    if (key) {
      urlPath += `/${key}`;
    }
    if (this.edgeURL) {
      if (consistency === "strong" && !this.uncachedEdgeURL) {
        throw new BlobsConsistencyError();
      }
      const headers = {
        authorization: `Bearer ${this.token}`
      };
      if (encodedMetadata) {
        headers[METADATA_HEADER_INTERNAL] = encodedMetadata;
      }
      if (this.region) {
        urlPath = `/region:${this.region}${urlPath}`;
      }
      const url2 = new URL(urlPath, consistency === "strong" ? this.uncachedEdgeURL : this.edgeURL);
      for (const key2 in parameters) {
        url2.searchParams.set(key2, parameters[key2]);
      }
      return {
        headers,
        url: url2.toString()
      };
    }
    const apiHeaders = { authorization: `Bearer ${this.token}` };
    const url = new URL(`/api/v1/blobs${urlPath}`, this.apiURL ?? "https://api.netlify.com");
    for (const key2 in parameters) {
      url.searchParams.set(key2, parameters[key2]);
    }
    if (this.region) {
      url.searchParams.set("region", this.region);
    }
    if (storeName === void 0 || key === void 0) {
      return {
        headers: apiHeaders,
        url: url.toString()
      };
    }
    if (encodedMetadata) {
      apiHeaders[METADATA_HEADER_EXTERNAL] = encodedMetadata;
    }
    if (method === "head" || method === "delete") {
      return {
        headers: apiHeaders,
        url: url.toString()
      };
    }
    const res = await this.fetch(url.toString(), {
      headers: { ...apiHeaders, accept: SIGNED_URL_ACCEPT_HEADER },
      method
    });
    if (res.status !== 200) {
      throw await createBlobsInternalError(res, { edgeAccess: this.edgeAccess, method, storeName });
    }
    const { url: signedURL } = await res.json();
    const userHeaders = encodedMetadata ? { [METADATA_HEADER_INTERNAL]: encodedMetadata } : void 0;
    return {
      headers: userHeaders,
      url: signedURL
    };
  }
  async makeRequest({
    body,
    conditions = {},
    consistency,
    headers: extraHeaders,
    key,
    metadata,
    method,
    parameters,
    storeName
  }) {
    const { headers: baseHeaders = {}, url } = await this.getFinalRequest({
      consistency,
      key,
      metadata,
      method,
      parameters,
      storeName
    });
    const headers = {
      ...baseHeaders,
      ...extraHeaders
    };
    if (method === "put") {
      headers["cache-control"] = "max-age=0, stale-while-revalidate=60";
    }
    if ("onlyIfMatch" in conditions && conditions.onlyIfMatch) {
      headers["if-match"] = conditions.onlyIfMatch;
    } else if ("onlyIfNew" in conditions && conditions.onlyIfNew) {
      headers["if-none-match"] = "*";
    }
    const options = {
      body,
      headers,
      method
    };
    if (body instanceof ReadableStream) {
      options.duplex = "half";
    }
    const usesSignedUrl = !this.edgeURL && key !== void 0 && storeName !== void 0 && method !== "head" && method !== "delete";
    let getRetryUrl;
    if (usesSignedUrl) {
      getRetryUrl = async () => {
        const finalRequest = await this.getFinalRequest({ consistency, key, metadata, method, parameters, storeName });
        return finalRequest.url;
      };
    }
    return fetchAndRetry(this.fetch, url, options, void 0, getRetryUrl);
  }
};
var getClientOptions = (options, contextOverride) => {
  const context = contextOverride ?? getEnvironmentContext();
  const siteID = context.siteID ?? options.siteID;
  const token = context.token ?? options.token;
  if (!siteID || !token) {
    throw new MissingBlobsEnvironmentError(["siteID", "token"]);
  }
  if (options.region !== void 0 && !isValidRegion(options.region)) {
    throw new InvalidBlobsRegionError(options.region);
  }
  const clientOptions = {
    apiURL: context.apiURL ?? options.apiURL,
    consistency: options.consistency,
    edgeURL: context.edgeURL ?? options.edgeURL,
    fetch: options.fetch,
    region: options.region,
    siteID,
    token,
    uncachedEdgeURL: context.uncachedEdgeURL ?? options.uncachedEdgeURL
  };
  return clientOptions;
};

// node_modules/@netlify/blobs/dist/main.js
var LEGACY_STORE_INTERNAL_PREFIX = "netlify-internal/legacy-namespace/";
var STATUS_OK = 200;
var STATUS_PRE_CONDITION_FAILED = 412;
var Store = class _Store {
  constructor(options) {
    this.client = options.client;
    if ("deployID" in options) {
      _Store.validateDeployID(options.deployID);
      let name = DEPLOY_STORE_PREFIX + options.deployID;
      if (options.name) {
        name += `:${options.name}`;
      }
      this.name = name;
    } else if (options.name.startsWith(LEGACY_STORE_INTERNAL_PREFIX)) {
      const storeName = options.name.slice(LEGACY_STORE_INTERNAL_PREFIX.length);
      _Store.validateStoreName(storeName);
      this.name = storeName;
    } else {
      _Store.validateStoreName(options.name);
      this.name = SITE_STORE_PREFIX + options.name;
    }
  }
  async delete(key) {
    const res = await this.client.makeRequest({ key, method: "delete", storeName: this.name });
    if (![200, 204, 404].includes(res.status)) {
      throw new BlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "delete",
        storeName: this.name
      });
    }
  }
  async deleteAll() {
    let totalDeletedBlobs = 0;
    let hasMore = true;
    while (hasMore) {
      const res = await this.client.makeRequest({ method: "delete", storeName: this.name });
      if (res.status !== 200) {
        throw new BlobsInternalError(res, {
          edgeAccess: this.client.edgeAccess,
          method: "delete",
          storeName: this.name
        });
      }
      const data = await res.json();
      if (typeof data.blobs_deleted !== "number") {
        throw new BlobsInternalError(res);
      }
      totalDeletedBlobs += data.blobs_deleted;
      hasMore = typeof data.has_more === "boolean" && data.has_more;
    }
    return {
      deletedBlobs: totalDeletedBlobs
    };
  }
  async get(key, options) {
    return withSpan(options?.span, "blobs.get", async (span) => {
      const { consistency, type } = options ?? {};
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.type": type,
        "blobs.method": "GET",
        "blobs.consistency": consistency
      });
      const res = await this.client.makeRequest({
        consistency,
        key,
        method: "get",
        storeName: this.name
      });
      span?.setAttributes({
        "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200) {
        throw new BlobsInternalError(res);
      }
      if (type === void 0 || type === "text") {
        return res.text();
      }
      if (type === "arrayBuffer") {
        return res.arrayBuffer();
      }
      if (type === "blob") {
        return res.blob();
      }
      if (type === "json") {
        return res.json();
      }
      if (type === "stream") {
        return res.body;
      }
      throw new BlobsInternalError(res);
    });
  }
  async getMetadata(key, options = {}) {
    return withSpan(options?.span, "blobs.getMetadata", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "HEAD",
        "blobs.consistency": options.consistency
      });
      const res = await this.client.makeRequest({
        consistency: options.consistency,
        key,
        method: "head",
        storeName: this.name
      });
      span?.setAttributes({
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200 && res.status !== 304) {
        throw new BlobsInternalError(res);
      }
      const etag = res?.headers.get("etag") ?? void 0;
      const metadata = getMetadataFromResponse(res);
      const result = {
        etag,
        metadata
      };
      return result;
    });
  }
  async getWithMetadata(key, options) {
    return withSpan(options?.span, "blobs.getWithMetadata", async (span) => {
      const { consistency, etag: requestETag, type } = options ?? {};
      const headers = requestETag ? { "if-none-match": requestETag } : void 0;
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "GET",
        "blobs.consistency": options?.consistency,
        "blobs.type": type,
        "blobs.request.etag": requestETag
      });
      const res = await this.client.makeRequest({
        consistency,
        headers,
        key,
        method: "get",
        storeName: this.name
      });
      const responseETag = res?.headers.get("etag") ?? void 0;
      span?.setAttributes({
        "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
        "blobs.response.etag": responseETag,
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200 && res.status !== 304) {
        throw new BlobsInternalError(res);
      }
      const metadata = getMetadataFromResponse(res);
      const result = {
        etag: responseETag,
        metadata
      };
      if (res.status === 304 && requestETag) {
        return { data: null, ...result };
      }
      if (type === void 0 || type === "text") {
        return { data: await res.text(), ...result };
      }
      if (type === "arrayBuffer") {
        return { data: await res.arrayBuffer(), ...result };
      }
      if (type === "blob") {
        return { data: await res.blob(), ...result };
      }
      if (type === "json") {
        return { data: await res.json(), ...result };
      }
      if (type === "stream") {
        return { data: res.body, ...result };
      }
      throw new Error(`Invalid 'type' property: ${type}. Expected: arrayBuffer, blob, json, stream, or text.`);
    });
  }
  list(options = {}) {
    return withSpan(options.span, "blobs.list", (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.method": "GET",
        "blobs.list.paginate": options.paginate ?? false
      });
      const iterator = this.getListIterator(options);
      if (options.paginate) {
        return iterator;
      }
      return collectIterator(iterator).then(
        (items) => items.reduce(
          (acc, item) => ({
            blobs: [...acc.blobs, ...item.blobs],
            directories: [...acc.directories, ...item.directories]
          }),
          { blobs: [], directories: [] }
        )
      );
    });
  }
  async set(key, data, options = {}) {
    return withSpan(options.span, "blobs.set", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "PUT",
        "blobs.data.size": typeof data == "string" ? data.length : data instanceof Blob ? data.size : data.byteLength,
        "blobs.data.type": typeof data == "string" ? "string" : data instanceof Blob ? "blob" : "arrayBuffer",
        "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
      });
      _Store.validateKey(key);
      const conditions = _Store.getConditions(options);
      const res = await this.client.makeRequest({
        conditions,
        body: data,
        key,
        metadata: options.metadata,
        method: "put",
        storeName: this.name
      });
      const etag = res.headers.get("etag") ?? "";
      span?.setAttributes({
        "blobs.response.etag": etag,
        "blobs.response.status": res.status
      });
      if (conditions) {
        return res.status === STATUS_PRE_CONDITION_FAILED ? { modified: false } : { etag, modified: true };
      }
      if (res.status === STATUS_OK) {
        return {
          etag,
          modified: true
        };
      }
      throw await createBlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "put",
        storeName: this.name
      });
    });
  }
  async setJSON(key, data, options = {}) {
    return withSpan(options.span, "blobs.setJSON", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "PUT",
        "blobs.data.type": "json",
        "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
      });
      _Store.validateKey(key);
      const conditions = _Store.getConditions(options);
      const payload = JSON.stringify(data);
      const headers = {
        "content-type": "application/json"
      };
      const res = await this.client.makeRequest({
        conditions,
        body: payload,
        headers,
        key,
        metadata: options.metadata,
        method: "put",
        storeName: this.name
      });
      const etag = res.headers.get("etag") ?? "";
      span?.setAttributes({
        "blobs.response.etag": etag,
        "blobs.response.status": res.status
      });
      if (conditions) {
        return res.status === STATUS_PRE_CONDITION_FAILED ? { modified: false } : { etag, modified: true };
      }
      if (res.status === STATUS_OK) {
        return {
          etag,
          modified: true
        };
      }
      throw new BlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "put",
        storeName: this.name
      });
    });
  }
  static formatListResultBlob(result) {
    if (!result.key) {
      return null;
    }
    return {
      etag: result.etag,
      key: result.key
    };
  }
  static getConditions(options) {
    if ("onlyIfMatch" in options && "onlyIfNew" in options) {
      throw new Error(
        `The 'onlyIfMatch' and 'onlyIfNew' options are mutually exclusive. Using 'onlyIfMatch' will make the write succeed only if there is an entry for the key with the given content, while 'onlyIfNew' will make the write succeed only if there is no entry for the key.`
      );
    }
    if ("onlyIfMatch" in options && options.onlyIfMatch) {
      if (typeof options.onlyIfMatch !== "string") {
        throw new Error(`The 'onlyIfMatch' property expects a string representing an ETag.`);
      }
      return {
        onlyIfMatch: options.onlyIfMatch
      };
    }
    if ("onlyIfNew" in options && options.onlyIfNew) {
      if (typeof options.onlyIfNew !== "boolean") {
        throw new Error(
          `The 'onlyIfNew' property expects a boolean indicating whether the write should fail if an entry for the key already exists.`
        );
      }
      return {
        onlyIfNew: true
      };
    }
  }
  static validateKey(key) {
    if (key === "") {
      throw new Error("Blob key must not be empty.");
    }
    if (key.startsWith("/") || key.startsWith("%2F")) {
      throw new Error("Blob key must not start with forward slash (/).");
    }
    if (new TextEncoder().encode(key).length > 600) {
      throw new Error(
        "Blob key must be a sequence of Unicode characters whose UTF-8 encoding is at most 600 bytes long."
      );
    }
  }
  static validateDeployID(deployID) {
    if (!/^\w{1,24}$/.test(deployID)) {
      throw new Error(`'${deployID}' is not a valid Netlify deploy ID.`);
    }
  }
  static validateStoreName(name) {
    if (name.includes("/") || name.includes("%2F")) {
      throw new Error("Store name must not contain forward slashes (/).");
    }
    if (new TextEncoder().encode(name).length > 64) {
      throw new Error(
        "Store name must be a sequence of Unicode characters whose UTF-8 encoding is at most 64 bytes long."
      );
    }
  }
  getListIterator(options) {
    const { client, name: storeName } = this;
    const parameters = {};
    if (options?.prefix) {
      parameters.prefix = options.prefix;
    }
    if (options?.directories) {
      parameters.directories = "true";
    }
    return {
      [Symbol.asyncIterator]() {
        let currentCursor = null;
        let done = false;
        return {
          async next() {
            return withSpan(options?.span, "blobs.list.next", async (span) => {
              span?.setAttributes({
                "blobs.store": storeName,
                "blobs.method": "GET",
                "blobs.list.paginate": options?.paginate ?? false,
                "blobs.list.done": done,
                "blobs.list.cursor": currentCursor ?? void 0
              });
              if (done) {
                return { done: true, value: void 0 };
              }
              const nextParameters = { ...parameters };
              if (currentCursor !== null) {
                nextParameters.cursor = currentCursor;
              }
              const res = await client.makeRequest({
                method: "get",
                parameters: nextParameters,
                storeName
              });
              span?.setAttributes({
                "blobs.response.status": res.status
              });
              let blobs = [];
              let directories = [];
              if (![200, 204, 404].includes(res.status)) {
                throw new BlobsInternalError(res);
              }
              if (res.status === 404) {
                done = true;
              } else {
                const page = await res.json();
                if (page.next_cursor) {
                  currentCursor = page.next_cursor;
                } else {
                  done = true;
                }
                blobs = (page.blobs ?? []).map(_Store.formatListResultBlob).filter(Boolean);
                directories = page.directories ?? [];
              }
              return {
                done: false,
                value: {
                  blobs,
                  directories
                }
              };
            });
          }
        };
      }
    };
  }
};
var getDeployStoreRegion = (clientOptions, context) => {
  if (clientOptions.region) {
    return clientOptions.region;
  }
  if (clientOptions.edgeURL || clientOptions.uncachedEdgeURL) {
    if (!context.primaryRegion) {
      throw new Error(
        "When accessing a deploy store, the Netlify Blobs client needs to be configured with a region, and one was not found in the environment. To manually set the region, set the `region` property in the store options. If you are using the Netlify CLI, you may have an outdated version; run `npm install -g netlify-cli@latest` to update and try again."
      );
    }
    return context.primaryRegion;
  }
  return REGION_AUTO;
};
var getStore = (input, options) => {
  if (typeof input === "string") {
    const contextOverride = options?.siteID && options?.token ? { siteID: options?.siteID, token: options?.token } : void 0;
    const clientOptions = getClientOptions(options ?? {}, contextOverride);
    const client = new Client(clientOptions);
    return new Store({ client, name: input });
  }
  if (typeof input?.name === "string") {
    const { name } = input;
    const contextOverride = input?.siteID && input?.token ? { siteID: input?.siteID, token: input?.token } : void 0;
    const clientOptions = getClientOptions(input, contextOverride);
    if (!name) {
      throw new MissingBlobsEnvironmentError(["name"]);
    }
    const client = new Client(clientOptions);
    return new Store({ client, name });
  }
  if (typeof input?.deployID === "string") {
    const context = getEnvironmentContext();
    const clientOptions = getClientOptions(input, context);
    const { deployID } = input;
    if (!deployID) {
      throw new MissingBlobsEnvironmentError(["deployID"]);
    }
    clientOptions.region = getDeployStoreRegion(clientOptions, context);
    const client = new Client(clientOptions);
    return new Store({ client, deployID });
  }
  throw new Error(
    "The `getStore` method requires the name of the store as a string or as the `name` property of an options object"
  );
};


// src/aktuelles.mjs
// „Aktuelles" der KG Bleibach Frauenberg: Beiträge und Fotos liegen in Netlify Blobs (wie die Termine).
// Speichern im /editor wirkt sofort, ohne neuen Build.
//   GET  /api/aktuelles           öffentliche Beiträge als JSON (für das Fenster auf der Startseite)
//   GET  /api/aktuelles/alle      alle Beiträge inkl. ausgeblendeter (nur mit Passwort, prüft zugleich das Passwort)
//   PUT  /api/aktuelles           Beiträge speichern (nur mit Passwort)
//   POST /api/aktuelles/bild      Foto hochladen, Felder „gross" und „klein" als JPEG (nur mit Passwort)
//   GET  /aktuelles               Übersicht aller Beiträge (HTML)
//   GET  /aktuelles/<adresse>     einzelner Beitrag (HTML, teilbar, für Google und Facebook-Vorschau)
//   GET  /aktuelles/bild/<id>.jpg Foto (<id>-k.jpg = kleine Fassung)
//   GET  /aktuelles/sitemap.xml   Sitemap der Beiträge
var SITE = "https://www.kg-bleibach.de";
var STORE = "kg-aktuelles";
var KEY = "beitraege";
var BILDER = "kg-aktuelles-bilder";
var TAG = "kg-aktuelles";
var MAX = 300;
var VEREIN = "KG „Bleibach“ Frauenberg 1972 e.V.";
var JSON_H = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
/* Öffentliche Antworten: Netlify-CDN hält sie kurz vor (wird beim Speichern zusätzlich geleert), Browser fragt jedes Mal nach */
var OEFFENTLICH = {
  "cache-control": "public, max-age=0, must-revalidate",
  "netlify-cdn-cache-control": "public, durable, s-maxage=60, stale-while-revalidate=300",
  "netlify-cache-tag": TAG
};
var json = (obj, status = 200, extra) => new Response(JSON.stringify(obj), { status, headers: Object.assign({}, JSON_H, extra || {}) });
function env(k) {
  try {
    if (typeof Netlify !== "undefined" && Netlify.env) {
      const v = Netlify.env.get(k);
      if (v) return v;
    }
  } catch (e) {
  }
  return typeof process !== "undefined" && process.env && process.env[k] || "";
}
function same(a, b) {
  const x = String(a), y = String(b);
  let r = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) r |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return r === 0;
}
async function auth(req) {
  const pw = env("EDITOR_PASSWORD");
  if (!pw) return json({ fehler: "nicht_eingerichtet" }, 503);
  let given = "";
  try {
    given = decodeURIComponent(req.headers.get("x-editor-passwort") || "");
  } catch (e) {
  }
  if (!same(given, pw)) {
    await new Promise((r) => setTimeout(r, 700));
    return json({ fehler: "falsches_passwort" }, 401);
  }
  return null;
}
var str = (v, n) => String(v == null ? "" : v).replace(/\r\n?/g, "\n").trim().slice(0, n);
var heute = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
var neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function slugify(s) {
  return String(s).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "") || "beitrag";
}
/* Eingaben aus dem Editor prüfen und vereinheitlichen. Liefert null bei ungültigen Daten. */
function clean(d) {
  if (!d || !Array.isArray(d.beitraege) || d.beitraege.length > MAX) return null;
  const ids = /* @__PURE__ */ new Set(), slugs = /* @__PURE__ */ new Set(), out = [];
  const SLUG = /^[a-z0-9][a-z0-9-]{2,79}$/;
  /* Bereits vergebene Adressen zuerst reservieren, damit sich bestehende Links nie ändern */
  const fest = /* @__PURE__ */ new Set();
  for (const b of d.beitraege) if (b && SLUG.test(b.slug || "") && !fest.has(b.slug)) fest.add(b.slug);
  for (const b of d.beitraege) {
    if (!b || typeof b !== "object") return null;
    const titel = str(b.titel, 140);
    if (!titel) return null;
    let id = /^[a-z0-9]{4,24}$/.test(b.id || "") ? b.id : neueId();
    while (ids.has(id)) id = neueId();
    ids.add(id);
    const datum = /^\d{4}-\d{2}-\d{2}$/.test(b.datum || "") ? b.datum : heute();
    let slug;
    if (SLUG.test(b.slug || "") && !slugs.has(b.slug)) slug = b.slug;
    else {
      const base = datum + "-" + slugify(titel);
      let i = 2;
      slug = base;
      while (slugs.has(slug) || fest.has(slug)) slug = base + "-" + i++;
    }
    slugs.add(slug);
    const k = b.kanaele && typeof b.kanaele === "object" ? b.kanaele : {};
    const bild = /^[a-z0-9]{8,32}$/.test(b.bild || "") ? b.bild : "";
    const dim = (v) => Number.isInteger(v) && v > 0 && v <= 1e4 ? v : 0;
    out.push({
      id,
      slug,
      titel,
      datum,
      text: str(b.text, 6e3),
      bild,
      bildAlt: bild ? str(b.bildAlt, 200) : "",
      bildB: bild ? dim(b.bildB) : 0,
      bildH: bild ? dim(b.bildH) : 0,
      kanaele: { web: k.web !== false, facebook: k.facebook === true, instagram: k.instagram === true },
      erstellt: /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(b.erstellt || "") ? b.erstellt : (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  out.sort((a, b) => a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : a.erstellt < b.erstellt ? 1 : a.erstellt > b.erstellt ? -1 : 0);
  return { version: 1, aktualisiert: (/* @__PURE__ */ new Date()).toISOString(), beitraege: out };
}
var LEER = { version: 1, aktualisiert: "", beitraege: [] };
async function laden(store) {
  const d = await store.get(KEY, { type: "json" });
  return d && Array.isArray(d.beitraege) ? d : LEER;
}
var sichtbar = (d) => d.beitraege.filter((b) => b.kanaele && b.kanaele.web);
function oeffentlich(d) {
  return {
    aktualisiert: d.aktualisiert,
    beitraege: sichtbar(d).map((b) => ({ id: b.id, slug: b.slug, titel: b.titel, datum: b.datum, text: b.text, bild: b.bild, bildAlt: b.bildAlt, bildB: b.bildB, bildH: b.bildH }))
  };
}
/* CDN-Zwischenspeicher für Beiträge leeren, damit Änderungen sofort sichtbar sind (sonst spätestens nach 1 Minute) */
async function purge(context) {
  const token = env("NETLIFY_PURGE_API_TOKEN");
  const site = env("SITE_ID") || context && context.site && context.site.id || "";
  if (!token || !site) return false;
  try {
    const r = await fetch("https://api.netlify.com/api/v1/purge", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf8", authorization: "Bearer " + token },
      body: JSON.stringify({ site_id: site, cache_tags: [TAG] })
    });
    return r.ok;
  } catch (e) {
    return false;
  }
}
/* Fotos, die in keinem Beitrag mehr vorkommen und älter als ein Tag sind, löschen */
async function aufraeumen(bilder, d) {
  try {
    const benutzt = new Set(d.beitraege.map((b) => b.bild).filter(Boolean));
    const { blobs } = await bilder.list();
    const grenze = Date.now() - 864e5;
    for (const { key } of blobs) {
      const id = key.replace(/-k$/, "");
      if (benutzt.has(id)) continue;
      const t = parseInt(id.slice(0, 8), 36);
      if (Number.isFinite(t) && t < grenze) await bilder.delete(key);
    }
  } catch (e) {
    console.error("Aufräumen fehlgeschlagen", e);
  }
}
var istJpeg = (u8) => u8.length > 3 && u8[0] === 255 && u8[1] === 216 && u8[2] === 255;
async function bildHochladen(req, bilder) {
  let fd;
  try {
    fd = await req.formData();
  } catch (e) {
    return json({ fehler: "ungueltig" }, 400);
  }
  const g = fd.get("gross"), k = fd.get("klein");
  if (!g || !k || typeof g.arrayBuffer !== "function" || typeof k.arrayBuffer !== "function") return json({ fehler: "ungueltig" }, 400);
  if (g.size > 4e6 || k.size > 1e6) return json({ fehler: "zu_gross" }, 413);
  const gb = new Uint8Array(await g.arrayBuffer()), kb = new Uint8Array(await k.arrayBuffer());
  if (!istJpeg(gb) || !istJpeg(kb)) return json({ fehler: "kein_jpeg" }, 415);
  const id = neueId();
  await bilder.set(id, gb.buffer, { metadata: { typ: "image/jpeg" } });
  await bilder.set(id + "-k", kb.buffer, { metadata: { typ: "image/jpeg" } });
  return json({ ok: true, id });
}
async function bildAusliefern(bilder, key) {
  const data = await bilder.get(key, { type: "arrayBuffer" });
  if (!data) return new Response("Nicht gefunden", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  return new Response(data, {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
      "netlify-cdn-cache-control": "public, durable, max-age=31536000, immutable",
      "x-content-type-options": "nosniff"
    }
  });
}
/* ---------- HTML ---------- */
var esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
function datumLang(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return y && m && d ? d + ". " + MONATE[m - 1] + " " + y : "";
}
var bildUrl = (id, klein) => "/aktuelles/bild/" + id + (klein ? "-k" : "") + ".jpg";
/* Fließtext: Leerzeile = neuer Absatz, Zeilenumbruch bleibt erhalten, Web-Adressen werden zu Links */
function absaetze(text) {
  return String(text || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => "<p>" + esc(p).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]"'])/g, (u) => '<a href="' + u + '" rel="noopener" target="_blank">' + u.replace(/^https?:\/\/(www\.)?/, "") + "</a>").replace(/\n/g, "<br>") + "</p>").join("\n");
}
function kurz(text, n) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), n - 20)).replace(/[\s,;:.!?–-]+$/, "") + " …";
}
function kopf({ titel, beschreibung, url, bild, bildB, bildH, typ, extra }) {
  const img = bild ? SITE + bild : SITE + "/kg-bleibach-hero.jpg";
  return [
    "<title>" + esc(titel) + "</title>",
    '<meta name="description" content="' + esc(beschreibung) + '">',
    '<link rel="canonical" href="' + esc(url) + '">',
    '<meta property="og:type" content="' + (typ || "website") + '">',
    '<meta property="og:locale" content="de_DE">',
    '<meta property="og:site_name" content="' + esc(VEREIN) + '">',
    '<meta property="og:title" content="' + esc(titel) + '">',
    '<meta property="og:description" content="' + esc(beschreibung) + '">',
    '<meta property="og:url" content="' + esc(url) + '">',
    '<meta property="og:image" content="' + esc(img) + '">',
    bild && bildB && bildH ? '<meta property="og:image:width" content="' + bildB + '">\n<meta property="og:image:height" content="' + bildH + '">' : bild ? "" : '<meta property="og:image:width" content="1600">\n<meta property="og:image:height" content="1200">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:image" content="' + esc(img) + '">',
    '<link rel="alternate" type="application/json" href="/api/aktuelles" title="Aktuelles">',
    extra || ""
  ].filter(Boolean).join("\n");
}
function karte(b, i) {
  const img = b.bild ? '<div class="aimg"><img src="' + bildUrl(b.bild, true) + '" alt="' + esc(b.bildAlt) + '" width="640" height="' + (b.bildB && b.bildH ? Math.round(640 * b.bildH / b.bildB) : 480) + '" loading="' + (i < 3 ? "eager" : "lazy") + '" decoding="async"></div>' : '<div class="aimg leer" aria-hidden="true"><span>Alaaf!</span></div>';
  return '<li class="acard rv" style="--d:' + i % 3 * 60 + 'ms"><a href="/aktuelles/' + esc(b.slug) + '">' + img + '<div class="abody"><time datetime="' + esc(b.datum) + '">' + esc(datumLang(b.datum)) + "</time><h2>" + esc(b.titel) + "</h2><p>" + esc(kurz(b.text, 180)) + '</p><span class="more">Weiterlesen →</span></div></a></li>';
}
function seiteListe(d) {
  const liste = sichtbar(d);
  const url = SITE + "/aktuelles";
  const head = kopf({
    titel: "Aktuelles — KG Bleibach Frauenberg 1972 e.V.",
    beschreibung: "Neuigkeiten der Karnevalsgesellschaft „Bleibach“ Frauenberg 1972 e.V. aus FrauObI: Berichte, Ankündigungen und Fotos aus der Session.",
    url
  });
  const main = '<header class="vhead"><div class="wrap">\n  <div class="crumb"><a href="/">Startseite</a> &nbsp;/&nbsp; Aktuelles</div>\n  <h1>Aktuelles <em>vom Bleibach</em></h1>\n  <p class="alede">Neuigkeiten, Berichte und Ankündigungen aus dem Verein. Die Termine der Session stehen <a href="/#termine">auf der Startseite</a>.</p>\n</div></header>\n<section class="wrap" aria-label="Alle Beiträge">\n' + (liste.length ? '<ul class="agrid">' + liste.map(karte).join("\n") + "</ul>" : '<div class="aleer rv"><p class="ak">Bald geht’s los</p><p class="at">Hier seht Ihr demnächst unsere aktuellsten News und Highlights.</p><p class="aw" aria-label="FrauObI Alaaf!"><span class="l1">FrauObI</span> <span class="l2">Alaaf<span class="pt">!</span></span></p><p class="ah">Bis dahin: Alle Termine der Session stehen <a href="/#termine">auf der Startseite</a> – und Neuigkeiten gibt’s auch auf <a href="https://www.facebook.com/p/KG-Bleibach-Frauenberg-1972-eV-100080045495452/" target="_blank" rel="noopener">Facebook</a>.</p></div>') + "\n</section>";
  return { head, main };
}
function seiteBeitrag(d, b) {
  const url = SITE + "/aktuelles/" + b.slug;
  const beschreibung = kurz(b.text, 155) || b.titel;
  const ld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: b.titel,
    datePublished: b.datum,
    dateModified: d.aktualisiert || b.datum,
    mainEntityOfPage: url,
    url,
    inLanguage: "de-DE",
    author: { "@type": "Organization", "@id": SITE + "/#verein", name: VEREIN },
    publisher: { "@type": "Organization", "@id": SITE + "/#verein", name: VEREIN, logo: { "@type": "ImageObject", url: SITE + "/kg-bleibach-logo.png" } },
    description: beschreibung
  };
  if (b.bild) ld.image = SITE + bildUrl(b.bild);
  const head = kopf({
    titel: b.titel + " — KG Bleibach Frauenberg",
    beschreibung,
    url,
    bild: b.bild ? bildUrl(b.bild) : "",
    bildB: b.bildB,
    bildH: b.bildH,
    typ: "article",
    extra: '<meta property="article:published_time" content="' + esc(b.datum) + '">\n<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, "\\u003c") + "</script>"
  });
  const weitere = sichtbar(d).filter((x) => x.id !== b.id).slice(0, 3);
  const enc = encodeURIComponent(url);
  const main = '<header class="vhead kurz"><div class="wrap">\n  <div class="crumb"><a href="/">Startseite</a> &nbsp;/&nbsp; <a href="/aktuelles">Aktuelles</a></div>\n</div></header>\n<article class="wrap apost">\n  <div class="atop"><time datetime="' + esc(b.datum) + '">' + esc(datumLang(b.datum)) + "</time><h1>" + esc(b.titel) + "</h1></div>\n" + (b.bild ? '  <figure class="afoto"><img src="' + bildUrl(b.bild) + '" alt="' + esc(b.bildAlt) + '"' + (b.bildB && b.bildH ? ' width="' + b.bildB + '" height="' + b.bildH + '"' : "") + ' decoding="async" fetchpriority="high"></figure>\n' : "") + '  <div class="atext">\n' + absaetze(b.text) + '\n  </div>\n  <div class="ashare" aria-label="Beitrag teilen"><span>Teilen</span>\n    <a class="btn" href="https://www.facebook.com/sharer/sharer.php?u=' + enc + '" target="_blank" rel="noopener">Facebook</a>\n    <a class="btn" href="https://wa.me/?text=' + encodeURIComponent(b.titel + " – " + url) + '" target="_blank" rel="noopener">WhatsApp</a>\n    <button class="btn" type="button" id="copyLink" data-url="' + esc(url) + '">Link kopieren</button>\n  </div>\n  <p class="aback"><a class="btn rot" href="/aktuelles">← Alle Beiträge</a></p>\n</article>\n' + (weitere.length ? '<section class="wrap amore" aria-labelledby="hMore"><h2 id="hMore">Weitere <em>Beiträge</em></h2><ul class="agrid">' + weitere.map(karte).join("\n") + "</ul></section>" : "");
  return { head, main };
}
function seite404() {
  return {
    head: "<title>Beitrag nicht gefunden — KG Bleibach Frauenberg</title>\n<meta name=\"robots\" content=\"noindex\">",
    main: '<header class="vhead"><div class="wrap"><div class="crumb"><a href="/">Startseite</a> &nbsp;/&nbsp; <a href="/aktuelles">Aktuelles</a></div><h1>Nicht <em>gefunden</em></h1><p class="alede">Diesen Beitrag gibt es nicht (mehr). <a href="/aktuelles">Hier geht es zu allen Beiträgen.</a></p></div></header>'
  };
}
/* Das Seitengerüst (Navigation, Fußzeile, Gestaltung) liegt als normale Datei unter /vorlagen/aktuelles.html */
var vorlage = { html: "", zeit: 0 };
async function holeVorlage(origin) {
  if (vorlage.html && Date.now() - vorlage.zeit < 3e5) return vorlage.html;
  try {
    const r = await fetch(origin + "/vorlagen/aktuelles.html");
    const t = r.ok ? await r.text() : "";
    if (t.includes("<!--AKT:MAIN-->")) {
      vorlage.html = t;
      vorlage.zeit = Date.now();
    }
  } catch (e) {
    console.error("Vorlage nicht erreichbar", e);
  }
  return vorlage.html || '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><!--AKT:HEAD--><style>body{font:1rem/1.6 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;background:#f4eddd;color:#191712}img{max-width:100%;height:auto}a{color:#d92f23}</style></head><body><p><a href="/">← KG Bleibach Frauenberg</a></p><main><!--AKT:MAIN--></main></body></html>';
}
async function html(origin, teile, status = 200) {
  const t = await holeVorlage(origin);
  const body = t.replace("<!--AKT:HEAD-->", () => teile.head).replace("<!--AKT:MAIN-->", () => teile.main);
  const headers = status === 200 ? Object.assign({ "content-type": "text/html; charset=utf-8" }, OEFFENTLICH) : { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" };
  return new Response(body, { status, headers });
}
function sitemap(d) {
  const urls = ['  <url><loc>' + SITE + "/aktuelles</loc>" + (d.aktualisiert ? "<lastmod>" + d.aktualisiert.slice(0, 10) + "</lastmod>" : "") + "<priority>0.8</priority></url>"].concat(sichtbar(d).map((b) => "  <url><loc>" + SITE + "/aktuelles/" + esc(b.slug) + "</loc><lastmod>" + esc(b.datum) + "</lastmod><priority>0.6</priority></url>"));
  return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join("\n") + "\n</urlset>\n", { headers: Object.assign({ "content-type": "application/xml; charset=utf-8" }, OEFFENTLICH) });
}
/* ---------- Anfragen ---------- */
var aktuelles_default = async (req, context) => {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const m = req.method;
  try {
    const store = getStore({ name: STORE, consistency: "strong" });
    const bilder = getStore({ name: BILDER, consistency: "strong" });
    if (p === "/api/aktuelles") {
      if (m === "GET" || m === "HEAD") return json(oeffentlich(await laden(store)), 200, OEFFENTLICH);
      if (m === "PUT") {
        const denied = await auth(req);
        if (denied) return denied;
        const raw = await req.text();
        if (raw.length > 1e6) return json({ fehler: "zu_gross" }, 413);
        let body;
        try {
          body = JSON.parse(raw);
        } catch (e) {
          return json({ fehler: "ungueltig" }, 400);
        }
        const data = clean(body);
        if (!data) return json({ fehler: "ungueltig" }, 400);
        await store.setJSON(KEY, data);
        const gepurgt = await purge(context);
        await aufraeumen(bilder, data);
        return json({ ok: true, aktualisiert: data.aktualisiert, sofort: gepurgt, beitraege: data.beitraege });
      }
      return json({ fehler: "methode" }, 405);
    }
    if (p === "/api/aktuelles/alle") {
      if (m !== "GET") return json({ fehler: "methode" }, 405);
      return await auth(req) || json(Object.assign({ ok: true }, await laden(store)));
    }
    if (p === "/api/aktuelles/bild") {
      if (m !== "POST") return json({ fehler: "methode" }, 405);
      return await auth(req) || await bildHochladen(req, bilder);
    }
    if (m !== "GET" && m !== "HEAD") return json({ fehler: "methode" }, 405);
    const bm = p.match(/^\/aktuelles\/bild\/([a-z0-9]{8,32})(-k)?\.jpg$/);
    if (bm) return await bildAusliefern(bilder, bm[1] + (bm[2] || ""));
    if (p === "/aktuelles/sitemap.xml") return sitemap(await laden(store));
    if (p === "/aktuelles") return await html(url.origin, seiteListe(await laden(store)));
    const sm = p.match(/^\/aktuelles\/([a-z0-9][a-z0-9-]{2,79})$/);
    if (sm) {
      const d = await laden(store);
      const b = sichtbar(d).find((x) => x.slug === sm[1]);
      if (b) return await html(url.origin, seiteBeitrag(d, b));
    }
    return await html(url.origin, seite404(), 404);
  } catch (e) {
    console.error(e);
    return p.startsWith("/api/") ? json({ fehler: "server" }, 500) : new Response("Gerade nicht erreichbar. Bitte gleich noch einmal versuchen.", { status: 500, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
};
export const config = {
  path: ["/api/aktuelles", "/api/aktuelles/*", "/aktuelles", "/aktuelles/*"]
};
export default aktuelles_default;
