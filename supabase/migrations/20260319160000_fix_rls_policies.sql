-- Fix: garantir RLS e policies para `authenticated` nas tabelas do linter.
-- Observação: o projeto usa `public.current_company_id()` e `public.current_role()`.

do $$
declare
  _table text;
  company_col text;
  vendedor_col text;
  user_col text;
  role_col text;
  id_col text;
  orcamento_fk_col text;

  orc_id_col text;
  orc_company_col text;
  orc_vendedor_col text;
  exists_orcamento_visible_expr text;
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
    -- Só aplica se a tabela existir no banco.
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = _table
    ) then
      execute format('alter table public.%I enable row level security;', _table);

      -- Limpa policies existentes para evitar duplicidade/conflito.
      for _p in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = _table
      loop
        execute format('drop policy if exists %I on public.%I;', _p.policyname, _table);
      end loop;

      if _table in ('empresas', 'lojas') then
        -- Tabelas "empresa-like": acesso baseado no id da empresa corrente.
        select column_name into id_col
        from information_schema.columns
        where table_schema = 'public'
          and table_name = _table
          and column_name in ('id')
        limit 1;

        if id_col is not null then
          execute format(
            'create policy %I on public.%I for select to authenticated using (%s);',
            format('%s_select_own_company', _table),
            _table,
            format('%I = public.current_company_id()', id_col)
          );

          -- Apenas gerentes podem alterar a "empresa/loja" da própria empresa.
          execute format(
            'create policy %I on public.%I for update to authenticated using (%s) with check (%s);',
            format('%s_update_gerente_own', _table),
            _table,
            format('%I = public.current_company_id() and public.current_role() = ''gerente''', id_col),
            format('%I = public.current_company_id() and public.current_role() = ''gerente''', id_col)
          );

          execute format(
            'create policy %I on public.%I for delete to authenticated using (%s);',
            format('%s_delete_gerente_own', _table),
            _table,
            format('%I = public.current_company_id() and public.current_role() = ''gerente''', id_col)
          );
        end if;

      elsif _table = 'usuarios' then
        -- Perfil/usuário: mesma empresa pode ver; update/delete apenas para gerente.
        select column_name into user_col
        from information_schema.columns
        where table_schema = 'public'
          and table_name = _table
          and column_name in ('user_id', 'id')
        limit 1;

        select column_name into company_col
        from information_schema.columns
        where table_schema = 'public'
          and table_name = _table
          and column_name in ('company_id', 'empresa_id')
        limit 1;

        select column_name into role_col
        from information_schema.columns
        where table_schema = 'public'
          and table_name = _table
          and column_name in ('role')
        limit 1;

        if company_col is not null and user_col is not null then
          execute format(
            'create policy %I on public.%I for select to authenticated using (%s OR %s);',
            'usuarios_select_same_company_or_own',
            _table,
            format('%I = public.current_company_id()', company_col),
            format('%I = auth.uid()', user_col)
          );

          execute format(
            'create policy %I on public.%I for update to authenticated using (%s and public.current_role() = ''gerente'') with check (%s);',
            'usuarios_update_gerente_own_company',
            _table,
            format('%I = public.current_company_id()', company_col),
            format('%I = public.current_company_id()', company_col)
          );

          execute format(
            'create policy %I on public.%I for delete to authenticated using (%s and public.current_role() = ''gerente'');',
            'usuarios_delete_gerente_own_company',
            _table,
            format('%I = public.current_company_id()', company_col)
          );

          -- Inserção de usuários provavelmente é feita via funções/edge,
          -- mas permitimos inserção para gerente na própria empresa.
          execute format(
            'create policy %I on public.%I for insert to authenticated with check (%s and public.current_role() = ''gerente'');',
            'usuarios_insert_gerente_own_company',
            _table,
            format('%I = public.current_company_id()', company_col)
          );
        end if;

      elsif _table = 'clientes' then
        select column_name into company_col
        from information_schema.columns
        where table_schema = 'public'
          and table_name = _table
          and column_name in ('company_id', 'empresa_id')
        limit 1;

        if company_col is not null then
          execute format(
            'create policy %I on public.%I for select to authenticated using (%s);',
            'clientes_select_same_company',
            _table,
            format('%I = public.current_company_id()', company_col)
          );

          execute format(
            'create policy %I on public.%I for insert to authenticated with check (%s);',
            'clientes_insert_same_company',
            _table,
            format('%I = public.current_company_id()', company_col)
          );

          execute format(
            'create policy %I on public.%I for update to authenticated using (%s) with check (%s);',
            'clientes_update_same_company',
            _table,
            format('%I = public.current_company_id()', company_col),
            format('%I = public.current_company_id()', company_col)
          );

          execute format(
            'create policy %I on public.%I for delete to authenticated using (%s);',
            'clientes_delete_same_company',
            _table,
            format('%I = public.current_company_id()', company_col)
          );
        end if;

      elsif _table = 'produtos' then
        select column_name into company_col
        from information_schema.columns
        where table_schema = 'public'
          and table_name = _table
          and column_name in ('company_id', 'empresa_id')
        limit 1;

        if company_col is not null then
          execute format(
            'create policy %I on public.%I for select to authenticated using (%s);',
            'produtos_select_same_company',
            _table,
            format('%I = public.current_company_id()', company_col)
          );

          execute format(
            'create policy %I on public.%I for insert to authenticated with check (%s and public.current_role() = ''gerente'');',
            'produtos_insert_gerente_only',
            _table,
            format('%I = public.current_company_id()', company_col)
          );

          execute format(
            'create policy %I on public.%I for update to authenticated using (%s and public.current_role() = ''gerente'') with check (%s and public.current_role() = ''gerente'');',
            'produtos_update_gerente_only',
            _table,
            format('%I = public.current_company_id()', company_col),
            format('%I = public.current_company_id()', company_col)
          );

          execute format(
            'create policy %I on public.%I for delete to authenticated using (%s and public.current_role() = ''gerente'');',
            'produtos_delete_gerente_only',
            _table,
            format('%I = public.current_company_id()', company_col)
          );
        end if;

      elsif _table = 'orcamentos' then
        select column_name into company_col
        from information_schema.columns
        where table_schema = 'public'
          and table_name = _table
          and column_name in ('company_id', 'empresa_id')
        limit 1;

        select column_name into vendedor_col
        from information_schema.columns
        where table_schema = 'public'
          and table_name = _table
          and column_name in ('vendedor_id')
        limit 1;

        if company_col is not null and vendedor_col is not null then
          -- Gerente: tudo na empresa. Vendedor: apenas seus orçamentos.
          execute format(
            'create policy %I on public.%I for select to authenticated using (%s and (public.current_role() = ''gerente'' OR %s = auth.uid()));',
            'orcamentos_select_same_company_by_role',
            _table,
            format('%I = public.current_company_id()', company_col),
            vendedor_col
          );

          execute format(
            'create policy %I on public.%I for insert to authenticated with check (%s and ((public.current_role() = ''vendedor'' and %s = auth.uid()) OR public.current_role() = ''gerente''));',
            'orcamentos_insert_vendedor_or_gerente',
            _table,
            format('%I = public.current_company_id()', company_col),
            vendedor_col
          );

          execute format(
            'create policy %I on public.%I for update to authenticated using (%s and (public.current_role() = ''gerente'' OR %s = auth.uid())) with check (%s and ((public.current_role() = ''vendedor'' and %s = auth.uid()) OR public.current_role() = ''gerente''));',
            'orcamentos_update_owner_or_gerente',
            _table,
            format('%I = public.current_company_id()', company_col),
            vendedor_col,
            format('%I = public.current_company_id()', company_col),
            vendedor_col
          );

          execute format(
            'create policy %I on public.%I for delete to authenticated using (%s and (public.current_role() = ''gerente'' OR %s = auth.uid()));',
            'orcamentos_delete_owner_or_gerente',
            _table,
            format('%I = public.current_company_id()', company_col),
            vendedor_col
          );
        end if;

      elsif _table in ('itens_orcamento', 'condicoes_pagamento') then
        -- Itens/condições: visibilidade e escrita dependem do orcamento pai.
        select column_name into orcamento_fk_col
        from information_schema.columns
        where table_schema = 'public'
          and table_name = _table
          and column_name in ('orcamento_id')
        limit 1;

        select column_name into orc_id_col
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'orcamentos'
          and column_name in ('id')
        limit 1;

        select column_name into orc_company_col
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'orcamentos'
          and column_name in ('company_id', 'empresa_id')
        limit 1;

        select column_name into orc_vendedor_col
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'orcamentos'
          and column_name in ('vendedor_id')
        limit 1;

        if orcamento_fk_col is not null and orc_id_col is not null and orc_company_col is not null and orc_vendedor_col is not null then
          exists_orcamento_visible_expr :=
            format(
              'exists (select 1 from public.orcamentos o where o.%I = %I and o.%I = public.current_company_id() and (public.current_role() = ''gerente'' OR o.%I = auth.uid()))',
              orc_id_col,
              orcamento_fk_col,
              orc_company_col,
              orc_vendedor_col
            );

          execute format(
            'create policy %I on public.%I for select to authenticated using (%s);',
            format('%s_select_by_parent_orcamento', _table),
            _table,
            exists_orcamento_visible_expr
          );

          -- Escreve somente se o orcamento pai permitir (gerente ou vendedor dono).
          execute format(
            'create policy %I on public.%I for insert to authenticated with check (%s);',
            format('%s_insert_by_parent_orcamento', _table),
            _table,
            exists_orcamento_visible_expr
          );

          execute format(
            'create policy %I on public.%I for update to authenticated using (%s) with check (%s);',
            format('%s_update_by_parent_orcamento', _table),
            _table,
            exists_orcamento_visible_expr,
            exists_orcamento_visible_expr
          );

          execute format(
            'create policy %I on public.%I for delete to authenticated using (%s);',
            format('%s_delete_by_parent_orcamento', _table),
            _table,
            exists_orcamento_visible_expr
          );
        end if;
      end if;
    end if;
  end loop;
end $$;

