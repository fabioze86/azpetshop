export const prerender = false;

export function GET() {
  return new Response("google-site-verification: google46455295f224b736.html", {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
