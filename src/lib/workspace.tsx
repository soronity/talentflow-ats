import { Link } from "@tanstack/react-router";
import { createContext, useContext } from "react";

export type Workspace = { customerId: string | null; isAdmin: boolean };
export const WorkspaceCtx = createContext<Workspace>({ customerId: null, isAdmin: false });
/** The customer whose data is being viewed: yourself as a customer, or the picked customer as admin. */
export const useWorkspace = () => useContext(WorkspaceCtx);

export function NeedCustomer() {
  return (
    <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
      Pick a customer in the top-right menu to work on their jobs and candidates.
      <div className="mt-2 text-sm">
        No customers yet?{" "}
        <Link to="/admin" className="text-accent underline">
          Create one
        </Link>
      </div>
    </div>
  );
}
