// Pure account logic with an injected admin client so it can be unit-tested with mocks.
export type AccountInput = {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
  role: "admin" | "customer";
};

type AdminClient = {
  auth: {
    admin: {
      createUser: (a: any) => Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
      deleteUser: (id: string) => Promise<unknown>;
    };
  };
  from: (t: any) => any;
};

/** Creates the auth user + role row; deletes the user again if the role insert fails (no orphans). */
export async function createUserWithRoleUsing(admin: AdminClient, input: AccountInput) {
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name, company_name: input.company_name },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Could not create user");
  const { error: roleErr } = await admin.from("user_roles").insert({ user_id: data.user.id, role: input.role });
  if (roleErr) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(roleErr.message);
  }
  return { id: data.user.id };
}

/** One-time first admin. The single-row bootstrap_lock insert is atomic, so only one caller can win. */
export async function bootstrapAdminUsing(admin: AdminClient, input: Omit<AccountInput, "role">) {
  const { count } = await admin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if ((count ?? 0) > 0) throw new Error("An admin already exists");
  const { error: lockErr } = await admin.from("bootstrap_lock").insert({ id: 1 });
  if (lockErr) throw new Error("An admin already exists");
  try {
    return await createUserWithRoleUsing(admin, { ...input, role: "admin" });
  } catch (e) {
    await admin.from("bootstrap_lock").delete().eq("id", 1);
    throw e;
  }
}
