import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { signIn, register, DEFAULT_INVITE_CODE } from "../lib/api";

const FEATURES = [
  "商品ごとにクラウド保存。PC でもスマホでも、どこからでも編集",
  "原価・粗利・掛率をリアルタイムに自動計算",
  "PDF / Excel / HTML にワンクリックで出力",
  "スマホ最適化。外出先でも確認・修正できます",
];

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
    <div className="login-page">
      <section className="login-hero">
        <div className="login-hero-inner">
          <span className="login-eyebrow">商品企画書 ・ 原価表 ツール</span>
          <h1>
            企画書から原価表まで、
            <br />
            ひとつのアプリで。
          </h1>
          <p className="login-lead">
            Excel で作っていた商品企画書・原価表を、そのまま Web
            アプリに。商品ごとにクラウド保存し、原価や粗利を自動計算。PDF・Excel・HTML
            で出力できます。
          </p>
          <ul className="login-feats">
            {FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="login-form-col">
        <form className="login-card" onSubmit={submit}>
          <h2>{mode === "login" ? "ログイン" : "新規登録"}</h2>
          <p className="sub">
            {mode === "login"
              ? "アカウントにログインして続けます"
              : "新しいアカウントを作成します"}
          </p>

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
      </section>
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
