/* バックエンド接続設定。
   anonKey は RLS で保護された公開鍵（クライアント露出前提）なので埋め込み可。 */
(function (global) {
  'use strict';
  global.GENKA = global.GENKA || {};
  global.GENKA.config = {
    apiBase: 'https://lwxpbgbqldhnvcxnyehe.supabase.co/functions/v1/genka-api',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eHBiZ2JxbGRobnZjeG55ZWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MzI0MzksImV4cCI6MjA5MjMwODQzOX0.K0sSR_AZ8OeVTAB11pFL3qMohX769xSyes3-_SFNi5Y',
  };
})(window);
