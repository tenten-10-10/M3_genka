import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { signIn, register, DEFAULT_INVITE_CODE } from "../lib/api";

export default function Login() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [invite, setInvite] = useState(DEFAULT_INVITE_CODE);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    nav("/", { replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim(), invite.trim());
      }
      nav("/", { replace: true });
    } catch (e: unknown) {
      setErr(translateError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>商品企画書 / 原価表 ツール</h1>
        <p className="sub">{mode === "login" ? "ログインしてください" : "新規アカウント登録"}</p>

        {err && <div className="err">{err}</div>}

        {mode === "register" && (
          <div className="field">
            <label>お名前</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="山田 太郎" />
          </div>
        )}
        <div className="field">
          <label>メールアドレス</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </div>
        <div className="field">
          <label>パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
        {mode === "register" && (
          <div className="field">
            <label>招待コード</label>
            <input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="管理者から共有されたコード" />
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={busy} style={{ width: "100%", marginTop: 6 }}>
          {busy ? "処理中…" : mode === "login" ? "ログイン" : "登録してログイン"}
        </button>

        <div className="toggle">
          {mode === "login" ? (
            <>
              アカウントが無いですか？{" "}
              <button type="button" onClick={() => { setMode("register"); setErr(""); }}>
                新規登録
              </button>
            </>
          ) : (
            <>
              すでに登録済みですか？{" "}
              <button type="button" onClick={() => { setMode("login"); setErr(""); }}>
                ログイン
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function translateError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/Invalid login credentials/i.test(msg)) return "メールアドレスまたはパスワードが正しくありません";
  if (/Email not confirmed/i.test(msg)) return "メールアドレスが未確認です。新規登録からやり直してください";
  if (/already registered|already been registered|exists/i.test(msg)) return "このメールアドレスは既に登録されています";
  if (/招待コード|invite/i.test(msg)) return "招待コードが正しくありません";
  if (/Password should be/i.test(msg)) return "パスワードは6文字以上にしてください";
  return msg;
}
