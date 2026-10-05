import "next-auth";

declare module "next-auth" {
  interface User {
    workspaceId?: string;
  }
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      workspaceId?: string;
    };
  }
}
