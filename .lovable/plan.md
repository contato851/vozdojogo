# Corrigir logo dos times de "Meus Times"

## Problema (confirmado no código)

Ao selecionar um time personalizado (ex.: GOIANÉSIA), o `TeamPicker` envia apenas nome, cores e jogadores — o campo `logo_url` cadastrado é descartado (`src/components/TeamPicker.tsx:60-67`).

Como consequência, todas as telas que exibem escudo (`SetupScreen`, `LiveScreen`, `NotesScreen`, `ViewerScreen`) chamam `useTeamLogo(nome)`, que busca o escudo na Wikipédia pelo nome. Para "GOIANÉSIA" isso retorna uma imagem errada ou nenhuma.

## Solução

Fazer o escudo cadastrado viajar junto com o time selecionado, e ter prioridade sobre a busca automática.

1. Adicionar um campo opcional de logo ao time no estado da partida.
2. `TeamPicker` passa `logo_url` do time personalizado ao selecionar.
3. `SetupScreen` grava esse logo no time A/B (e limpa quando o time selecionado for da base padrão, evitando escudo residual).
4. Os componentes de escudo passam a aceitar um `logoUrl` explícito: se existir, renderizam direto; senão, mantêm o comportamento atual de busca por nome.
5. Incluir o logo no payload de transmissão para que a tela pública (`ViewerScreen`) mostre o mesmo escudo.

## Detalhes técnicos

- `src/data/types.ts`: campo opcional `logo?: string | null` no tipo de time da partida.
- `src/components/TeamPicker.tsx`: `handleSelectCustom` inclui `logo: ct.logo_url`.
- `src/components/SetupScreen.tsx`: `selectTeam` grava `logo` (custom) ou `undefined` (base).
- `src/hooks/useTeamLogo.ts`: aceitar override — retorna imediatamente a URL informada sem consultar a Wikipédia.
- `SetupScreen`/`LiveScreen`/`NotesScreen`/`ViewerScreen`: componentes internos de escudo recebem `logoUrl` opcional.
- `src/data/broadcast.ts`: propagar o campo `logo` no estado publicado.

Nenhuma mudança de banco de dados é necessária — `custom_teams.logo_url` já existe.
