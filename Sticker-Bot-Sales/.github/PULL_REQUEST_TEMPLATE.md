# 🛑 Sleekblue Pull Request Checklist

> **STOP:** Before you request a review, you must prove that you have adhered to `RULES.md` and `WORKFLOWS.md`. Any unchecked boxes will result in an automatic rejection.

### 🛡️ The Zero-Defect Guarantee
- [ ] I have completely removed all `console.log()` statements and `// TODO` comments from my production code.
- [ ] I did not use the `any` type anywhere in this PR. All types are strictly defined or inferred.
- [ ] I did not swallow any errors. My code fails loud and early if a condition is unmet.

### 💅 UI/UX Compliance
- [ ] I have tested this UI on a 375px mobile screen simulation. It does not break or overflow.
- [ ] Every new button or interactive element I added has a `hover:` state and a transition animation.
- [ ] I did not introduce any random hex colors. I strictly used the tokens defined in `index.css`.

### 🗄️ Backend & State Integrity
- [ ] Any pricing or mathematical logic is strictly handled on the backend (`api-server`), NEVER on the client.
- [ ] If I modified the database schema, I updated the Drizzle ORM models and ran the necessary migration tests.

### 📦 Supply Chain Defense
- [ ] If I added a new dependency to `package.json`, I verified that it was absolutely necessary and couldn't be written in standard JavaScript.
- [ ] I have not tampered with the `minimumReleaseAge` defense in `pnpm-workspace.yaml`.

---

### 📝 Describe Your Changes:
*(Explain what you changed, why you changed it, and how it directly increases sales or system stability)*
...

### 📸 Screenshots (If UI changed):
*(Drop mobile and desktop screenshots here)*
...
