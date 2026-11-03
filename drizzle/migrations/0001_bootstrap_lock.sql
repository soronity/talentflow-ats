CREATE TABLE public.bootstrap_lock (id integer PRIMARY KEY CHECK (id = 1), claimed_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.bootstrap_lock TO service_role;
ALTER TABLE public.bootstrap_lock ENABLE ROW LEVEL SECURITY;
INSERT INTO public.bootstrap_lock (id) SELECT 1 WHERE EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin');