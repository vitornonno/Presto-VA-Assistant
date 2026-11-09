# Quo — follow-ups e histórico da proposta de API

**Decisão atual:** não seguir com a integração pela API do Quo. A extensão funciona pela leitura da página aberta e os follow-ups são copiados para envio manual pelo VA. O texto abaixo registra a proposta anterior e não descreve uma integração ativa.

## Objetivo

Na extensão Presto VA Assistant, identificar a empresa e o nome do cliente da conversa aberta no Quo para permitir ao VA copiar os follow-ups existentes da empresa. O VA revisa e envia a mensagem manualmente. As cotações no Yelp e os demais fluxos existentes continuam independentes.

## Contas

- Um workspace compartilhado: Express, Gleam, Da Silva, Jhey's, UT Cleans e Mary's.
- Um workspace separado: KACS.
- As conexões, credenciais e consultas devem ser isoladas por workspace. Não presumir que um identificador ou nome de contato de um workspace pertence ao outro.

## Identificação e validação

- O HTML de exemplo local da Jhey's contém links no formato `/inbox/PN.../c/CN...`. O identificador do número e o da conversa da rota ativa são candidatos para vincular a página ao resultado da API; confirmar no Quo real antes de depender deles.
- A API documenta listagem paginada de conversas com `id`, `phoneNumberId` e participantes, além de contatos com nomes e telefones. Uma correspondência deve ser inequívoca e pertencer ao número/workspace correto; não atribuir contatos por nome parecido.
- Mapear cada número do Quo à empresa correspondente por configuração validada. Quando o contato não estiver cadastrado, houver nomes duplicados ou não for possível validar a conversa, pedir ao VA para confirmar ou informar o nome em vez de presumir.
- Reutilizar os modelos e as situações de follow-up de cada empresa. Não enviar SMS pela API nem alterar o status da conversa neste fluxo.

## Credenciais e implantação

- O Quo informa que uma chave API tem acesso amplo ao workspace. Não embuti-la na extensão distribuída nem registrá-la em Git, logs, debug ou mensagens. A forma de armazenamento e controle de acesso das duas chaves deve ser definida antes da implantação.
- A API não oferece, pela documentação verificada, um endpoint de contato por telefone na listagem v1; paginação, limites e o volume de dados precisam ser verificados antes de escolher o método de busca.
- O exemplo de HTML em `docs/Quo.txt` contém dados operacionais e deve permanecer local.

Fontes: [autenticação](https://www.quo.com/docs/mdx/api-reference/authentication), [conversas](https://www.quo.com/docs/mdx/api-reference/conversations/list-conversations), [contatos](https://www.quo.com/docs/mdx/api-reference/contacts/list-contacts), [números](https://www.quo.com/docs/mdx/api-reference/phone-numbers/list-phone-numbers).
