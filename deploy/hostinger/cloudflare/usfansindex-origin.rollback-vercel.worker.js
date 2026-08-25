// Emergency rollback only. This restores the pre-migration Vercel upstream.
var worker_default = {
  fetch(request, env) {
    const url = new URL(request.url);
    const requestHost = (request.headers.get("host") || url.hostname).split(":")[0];
    const isEdgeRequest = request.headers.has("cf-ray") || request.headers.has("cf-visitor");

    if (
      isEdgeRequest &&
      (requestHost === "www.usfansindex.net" ||
        (requestHost === "usfansindex.net" && url.protocol !== "https:"))
    ) {
      url.protocol = "https:";
      url.host = "usfansindex.net";
      return Response.redirect(url.toString(), 308);
    }

    url.protocol = "https:";
    url.host = "indexfinds-web.vercel.app";
    const upstreamRequest = new Request(url, request);
    upstreamRequest.headers.set("x-indexfinds-tenant-host", "usfansindex.net");
    upstreamRequest.headers.set(
      "x-indexfinds-tenant-secret",
      env.INDEXFINDS_TENANT_PROXY_SECRET,
    );
    return fetch(upstreamRequest);
  },
};

export { worker_default as default };
