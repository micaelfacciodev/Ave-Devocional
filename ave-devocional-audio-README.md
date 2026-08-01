# Áudios das orações — como funciona

## Onde os áudios ficam
Não vão pro repositório do GitHub (git não é lugar pra guardar arquivos de mídia — o repo ficaria pesado e lento). Os áudios ficam no **Supabase Storage**, e o site só guarda a *URL* de cada um nos arquivos JSON.

## Passo a passo pra subir um áudio

1. **Criar o bucket** (só precisa fazer uma vez): no painel do Supabase → **Storage** → **New bucket** → nome `oracoes` → marcar como **Public** (senão o navegador do visitante não consegue tocar o arquivo).

2. **Gravar e exportar em `.mp3`**, formato leve (128kbps já é ótimo pra voz, arquivo pequeno carrega rápido).

3. **Nomear o arquivo** seguindo o padrão:
   - Orações curtas: `{id}-ele.mp3` e `{id}-ela.mp3`
     - Exemplos: `ave-maria-ele.mp3`, `ave-maria-ela.mp3`, `salve-rainha-ele.mp3`...
     - Os ids das orações são: `ave-maria`, `salve-rainha`, `angelus`, `memorare`
   - Mistérios do terço: `{conjunto}-{indice}-ele.mp3`
     - `{conjunto}` = `gozosos`, `dolorosos`, `gloriosos` ou `luminosos`
     - `{indice}` = posição do mistério na lista, começando em **0** (1º mistério = 0, 2º = 1, até o 5º = 4)
     - Exemplo: `dolorosos-0-ele.mp3` é o 1º Mistério Doloroso (Agonia no Horto)

4. **Subir o arquivo** no bucket `oracoes` pelo painel do Supabase (Storage → oracoes → Upload file).

5. **Pegar a URL pública**: clicar no arquivo já subido → "Copy URL" (ou "Get URL"). Vai ser algo parecido com:
   ```
   https://[seu-projeto].supabase.co/storage/v1/object/public/oracoes/ave-maria-ele.mp3
   ```

6. **Colar a URL no JSON certo:**
   - Orações curtas → `data/oracoes.json`, no campo `audio_ele` ou `audio_ela` da oração correspondente
   - Mistérios do terço → `data/misterios.json`, dentro do mistério certo, mesmo campo

7. Commitar e subir a alteração do JSON pro GitHub (isso sim pode ir pro repo — é só texto, não o áudio em si).

## O que acontece se faltar áudio
Não quebra nada. Se `audio_ele` e `audio_ela` estiverem como `null`, a página mostra **"🎙️ Áudio em breve"** no lugar do player. Dá pra subir aos poucos, sem pressa de ter tudo gravado de uma vez.

## Onde os áudios aparecem no site
- **`/oracoes`** — Ave Maria, Salve Rainha, Angelus, Memorare (texto completo + player)
- **`/terco`** — cada um dos 20 mistérios (5 por conjunto × 4 conjuntos) tem seu próprio player

Quando os dois áudios (ele e ela) estão preenchidos, o player mostra botões **Ele / Ela** pra escolher a voz. Se só um dos dois existir, toca só aquele, sem mostrar a opção de escolha.
