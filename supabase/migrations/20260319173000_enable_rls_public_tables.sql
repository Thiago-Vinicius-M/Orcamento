-- Habilita RLS e cria policies de acesso autenticado para tabelas públicas
-- citadas no linter (`rls_disabled_in_public`), quando existirem no schema.
-- A migração é idempotente: não remove policies existentes.

do $$
declare
  _table text;
  company_col text;
  user_col text;
  vendedor_col text;
  id_col text;
  orcamento_fk_col text;
begin
  foreach _table in array[
    'lojas',
    'empresas',
    'usuarios',
    'clientes',
    'orcamentos',
    'condicoes_pagamento',
    'itens_orcamento',
    'produtos'
  ] loop
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = _table
    ) then
      execute format('alter table public.%I enable row level security;', _table);

      if _table in ('lojas', 'empresas') then
        select c.column_name
        into company_col
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = _table
          and c.column_name in ('company_id', 'empresa_id')
        limit 1;

        select c.column_name
        into id_col
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = _table
          and c.column_name = 'id'
        limit 1;

        if not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = _table and p.policyname = _table || '_select_authenticated'
        ) then
          if company_col is not null then
            execute format(
              'create policy %I on public.%I for select to authenticated using (%I = public.current_company_id());',
              _table || '_select_authenticated',
              _table,
              company_col
            );
          elsif id_col is not null then
            execute format(
              'create policy %I on public.%I for select to authenticated using (%I = public.current_company_id());',
              _table || '_select_authenticated',
              _table,
              id_col
            );
          end if;
        end if;

        if not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = _table and p.policyname = _table || '_write_gerente_authenticated'
        ) then
          if company_col is not null then
            execute format(
              'create policy %I on public.%I for all to authenticated using (%I = public.current_company_id() and public.current_role() = ''gerente'') with check (%I = public.current_company_id() and public.current_role() = ''gerente'');',
              _table || '_write_gerente_authenticated',
              _table,
              company_col,
              company_col
            );
          elsif id_col is not null then
            execute format(
              'create policy %I on public.%I for all to authenticated using (%I = public.current_company_id() and public.current_role() = ''gerente'') with check (%I = public.current_company_id() and public.current_role() = ''gerente'');',
              _table || '_write_gerente_authenticated',
              _table,
              id_col,
              id_col
            );
          end if;
        end if;

      elsif _table = 'usuarios' then
        select c.column_name
        into company_col
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = _table
          and c.column_name in ('company_id', 'empresa_id')
        limit 1;

        select c.column_name
        into user_col
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = _table
          and c.column_name in ('user_id', 'id')
        limit 1;

        if company_col is not null and user_col is not null and not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = _table and p.policyname = 'usuarios_select_authenticated'
        ) then
          execute format(
            'create policy usuarios_select_authenticated on public.%I for select to authenticated using (%I = public.current_company_id() or %I = auth.uid());',
            _table,
            company_col,
            user_col
          );
        end if;

        if company_col is not null and not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = _table and p.policyname = 'usuarios_write_gerente_authenticated'
        ) then
          execute format(
            'create policy usuarios_write_gerente_authenticated on public.%I for all to authenticated using (%I = public.current_company_id() and public.current_role() = ''gerente'') with check (%I = public.current_company_id() and public.current_role() = ''gerente'');',
            _table,
            company_col,
            company_col
          );
        end if;

      elsif _table in ('clientes', 'produtos') then
        select c.column_name
        into company_col
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = _table
          and c.column_name in ('company_id', 'empresa_id')
        limit 1;

        if company_col is not null and not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = _table and p.policyname = _table || '_select_authenticated'
        ) then
          execute format(
            'create policy %I on public.%I for select to authenticated using (%I = public.current_company_id());',
            _table || '_select_authenticated',
            _table,
            company_col
          );
        end if;

        if company_col is not null and not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = _table and p.policyname = _table || '_insert_authenticated'
        ) then
          execute format(
            'create policy %I on public.%I for insert to authenticated with check (%I = public.current_company_id());',
            _table || '_insert_authenticated',
            _table,
            company_col
          );
        end if;

        if company_col is not null and not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = _table and p.policyname = _table || '_update_authenticated'
        ) then
          execute format(
            'create policy %I on public.%I for update to authenticated using (%I = public.current_company_id()) with check (%I = public.current_company_id());',
            _table || '_update_authenticated',
            _table,
            company_col,
            company_col
          );
        end if;

        if company_col is not null and not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = _table and p.policyname = _table || '_delete_authenticated'
        ) then
          execute format(
            'create policy %I on public.%I for delete to authenticated using (%I = public.current_company_id());',
            _table || '_delete_authenticated',
            _table,
            company_col
          );
        end if;

      elsif _table = 'orcamentos' then
        select c.column_name
        into company_col
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = _table
          and c.column_name in ('company_id', 'empresa_id')
        limit 1;

        select c.column_name
        into vendedor_col
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = _table
          and c.column_name = 'vendedor_id'
        limit 1;

        if company_col is not null and vendedor_col is not null and not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = _table and p.policyname = 'orcamentos_select_authenticated'
        ) then
          execute format(
            'create policy orcamentos_select_authenticated on public.%I for select to authenticated using (%I = public.current_company_id() and (public.current_role() = ''gerente'' or %I = auth.uid()));',
            _table,
            company_col,
            vendedor_col
          );
        end if;

        if company_col is not null and vendedor_col is not null and not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = _table and p.policyname = 'orcamentos_insert_authenticated'
        ) then
          execute format(
            'create policy orcamentos_insert_authenticated on public.%I for insert to authenticated with check (%I = public.current_company_id() and ((public.current_role() = ''vendedor'' and %I = auth.uid()) or public.current_role() = ''gerente''));',
            _table,
            company_col,
            vendedor_col
          );
        end if;

        if company_col is not null and vendedor_col is not null and not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = _table and p.policyname = 'orcamentos_update_authenticated'
        ) then
          execute format(
            'create policy orcamentos_update_authenticated on public.%I for update to authenticated using (%I = public.current_company_id() and (public.current_role() = ''gerente'' or %I = auth.uid())) with check (%I = public.current_company_id() and ((public.current_role() = ''vendedor'' and %I = auth.uid()) or public.current_role() = ''gerente''));',
            _table,
            company_col,
            vendedor_col,
            company_col,
            vendedor_col
          );
        end if;

        if company_col is not null and vendedor_col is not null and not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = _table and p.policyname = 'orcamentos_delete_authenticated'
        ) then
          execute format(
            'create policy orcamentos_delete_authenticated on public.%I for delete to authenticated using (%I = public.current_company_id() and (public.current_role() = ''gerente'' or %I = auth.uid()));',
            _table,
            company_col,
            vendedor_col
          );
        end if;

      elsif _table in ('condicoes_pagamento', 'itens_orcamento') then
        select c.column_name
        into orcamento_fk_col
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = _table
          and c.column_name = 'orcamento_id'
        limit 1;

        if orcamento_fk_col is not null and not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = _table and p.policyname = _table || '_select_authenticated'
        ) then
          execute format(
            'create policy %I on public.%I for select to authenticated using (exists (select 1 from public.orcamentos o where o.id = %I and o.company_id = public.current_company_id() and (public.current_role() = ''gerente'' or o.vendedor_id = auth.uid())));',
            _table || '_select_authenticated',
            _table,
            orcamento_fk_col
          );
        end if;

        if orcamento_fk_col is not null and not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = _table and p.policyname = _table || '_write_authenticated'
        ) then
          execute format(
            'create policy %I on public.%I for all to authenticated using (exists (select 1 from public.orcamentos o where o.id = %I and o.company_id = public.current_company_id() and (public.current_role() = ''gerente'' or o.vendedor_id = auth.uid()))) with check (exists (select 1 from public.orcamentos o where o.id = %I and o.company_id = public.current_company_id() and (public.current_role() = ''gerente'' or o.vendedor_id = auth.uid())));',
            _table || '_write_authenticated',
            _table,
            orcamento_fk_col,
            orcamento_fk_col
          );
        end if;
      end if;
    end if;
  end loop;
end $$;
