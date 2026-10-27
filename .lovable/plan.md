# Restyle the sign-in page to the new design

Same layout and behaviour as today (logo + name on top, email/password, "Forgot password?", Sign in, "or", Continue with Google, Create account link). Only the look changes to match Overview/Squad/Landing.

## Design
- Pure black background (#000), centered card #0A0A0A, 1px #222 border, 16px radius, no shadow
- Logo centered, "Career Chronicles" in Inter Tight bold below, one muted subtitle line ("Sign in to your FC 26 careers" / "Create your account")
- Inputs: dark (#0A0A0A/#000) with #2A2A2A border, 10px radius, muted labels
- "Sign in" button: green #16A34A, black text, 10px radius, full width
- Divider "or" in muted #8C8C8C with #1A1A1A lines
- "Continue with Google": transparent with 1px #2A2A2A border, Google "G" icon
- Bottom link muted, "Create account" white
- Small footer links (Privacy / Terms) under the card
- Works on phone (card full width with padding)

## Technical
- Only `src/routes/auth.tsx`; wrap root in existing `landing-dark` / `ov-*` tokens and `font-tight` class. No logic changes.
