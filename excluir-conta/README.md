# Página de exclusão de conta

Página estática para autenticar uma conta Raiz com e-mail e senha e solicitar sua exclusão pela Edge Function `delete-account`.

## Configuração obrigatória

1. Em `config.js`, substitua `COLE_AQUI_A_CHAVE_PUBLICA_DO_SUPABASE` pela chave **Publishable** do projeto. A chave Publishable/anon foi criada para uso público no navegador.
2. Nunca coloque `SUPABASE_SERVICE_ROLE_KEY`, senha do banco ou qualquer secret administrativo nesta pasta.
3. Confirme que a Edge Function está publicada com `verify_jwt = true` e com seus secrets somente no ambiente do Supabase.
4. O SDK está fixado em uma versão específica no `index.html`. Para eliminar a dependência do CDN, hospede essa versão na própria LP e mantenha a política de conteúdo atualizada.
5. Publique a pasta em HTTPS. A rota esperada é `/excluir-conta/`.

## Fluxo de segurança

- O navegador autentica com e-mail e senha sem persistir a sessão em armazenamento local.
- A senha é apagada do campo assim que a autenticação termina.
- O modal só libera a ação quando `EXCLUIR` é digitado exatamente em maiúsculas.
- A requisição envia apenas o JWT da sessão para a Edge Function; não envia `userId` nem e-mail para decidir qual conta excluir.
- A chave administrativa permanece exclusivamente na Edge Function.

## Teste local

Execute o servidor a partir da raiz da LP:

```powershell
python -m http.server 4173
```

Acesse `http://localhost:4173/excluir-conta/`.
