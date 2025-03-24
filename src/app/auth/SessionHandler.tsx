"use client";

import { useEffect } from "react";
import { handleLogoutAction } from "./actions";
import { Session } from "next-auth";

function SessionHandler({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (session?.expires) {
      const expirationTime = new Date(session.expires).getTime();
      const currentTime = Date.now();
      const timeUntilExpiration = expirationTime - currentTime;

      if (timeUntilExpiration > 0) {
        const timeout = setTimeout(() => {
          handleLogoutAction();
        }, timeUntilExpiration);

        return () => clearTimeout(timeout);
      } else {
        handleLogoutAction();
      }
    }
  }, [session]);

  return <>{children}</>;
}

export default SessionHandler;
