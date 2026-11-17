export const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export const bodyRect = body => ({ x: body.x, y: body.y, w: body.width, h: body.height });
// A box of size w x h that starts `near` px in front of x and extends forward.
export const frontRect = (x, face, near, w, y, h) => ({ x: face > 0 ? x + near : x - near - w, y, w, h });
