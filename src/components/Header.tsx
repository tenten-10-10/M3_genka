import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { signOut } from "../lib/api";
import Logo from "./Logo";
import type { ReactNode } from "react";

export default function Header({
  children,
  onBrandClick,
}: {
  children?: ReactNode;
  onBrandClick?: () => void;
}) {
  const { user } = useAuth();
  const nav = useNavigate();

  async function logout() {
    await signOut();
    nav("/login", { replace: true });
  }

  function goHome() {
    if (onBrandClick) onBrandClick();
    else nav("/");
  }

  return (
    <header className="app-header">
      <span className="brand" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }} onClick={goHome} title="トップに戻る">
        <Logo color="#ffffff" height={26} />
        <span style={{ fontSize: 13, opacity: 0.8, fontWeight: 600 }}>商品企画書 / 原価表</span>
      </span>
      {children}
      <span className="spacer" />
      <span className="user">{user?.email}</span>
      <button className="btn-ghost" style={{ color: "#fff" }} onClick={logout}>
        ログアウト
      </button>
    </header>
  );
}
