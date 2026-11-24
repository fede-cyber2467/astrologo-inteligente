-- Astrólogo Inteligente: cuentas, plan y uso diario.
-- Cada persona ve solo lo suyo; el uso lo escriben únicamente las funciones del servidor.

create table public.cuentas (
  id uuid primary key references auth.users on delete cascade,
  plan text not null default 'gratis' check (plan in ('gratis', 'pago')),
  plan_hasta timestamptz,                       -- vencimiento de la suscripción paga
  origen_pago text,                             -- 'mercadopago' | 'apple' | 'google'
  creado timestamptz not null default now()
);

create table public.uso (
  usuario uuid not null references auth.users on delete cascade,
  dia date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
  consultas int not null default 0,
  voz_caracteres int not null default 0,
  primary key (usuario, dia)
);

alter table public.cuentas enable row level security;
alter table public.uso enable row level security;
create policy "ver mi cuenta" on public.cuentas for select using (auth.uid() = id);
create policy "ver mi uso" on public.uso for select using (auth.uid() = usuario);

-- Al registrarse alguien, se le crea la cuenta en plan gratis
create function public.crear_cuenta() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.cuentas (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger al_registrarse after insert on auth.users for each row execute function public.crear_cuenta();

-- Suma uso del día y devuelve el total; lo llaman solo las funciones del servidor
create function public.sumar_uso(p_usuario uuid, p_consultas int, p_voz int)
returns table (consultas int, voz_caracteres int) language plpgsql security definer set search_path = public as $$
declare hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  insert into public.uso (usuario, dia, consultas, voz_caracteres) values (p_usuario, hoy, p_consultas, p_voz)
  on conflict (usuario, dia) do update set consultas = uso.consultas + p_consultas, voz_caracteres = uso.voz_caracteres + p_voz;
  return query select u.consultas, u.voz_caracteres from public.uso u where u.usuario = p_usuario and u.dia = hoy;
end $$;
revoke all on function public.sumar_uso(uuid, int, int) from public, anon, authenticated;

-- Permisos explícitos (el proyecto no los otorga automáticamente a las tablas nuevas)
grant select on public.cuentas, public.uso to authenticated;
grant all on public.cuentas, public.uso to service_role;
grant execute on function public.sumar_uso(uuid, int, int) to service_role;
