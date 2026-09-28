# Comandos de desenvolvimento — AppBroto

Referência rápida dos comandos de terminal usados neste Mac pra testar o app. Sempre rodar a partir da pasta do projeto (`~/Projetos Pessoais/AppBroto`).

---

## 1. Metro Bundler

Precisa estar rodando antes de abrir o app no simulador iOS ou no Android — é ele que serve o código JS pro app.

**Iniciar:**
```bash
CI=1 npx expo start --dev-client
```

**Reiniciar** (obrigatório depois de qualquer mudança no código — com `CI=1` o Metro não detecta arquivo alterado sozinho):
```bash
pkill -f "expo start"
CI=1 npx expo start --dev-client
```

---

## 2. iPhone — Simulador iOS

Com o Metro já rodando (passo 1):

```bash
npx expo run:ios
```

Builda, instala e abre no simulador já booted (ou boota um padrão sozinho).

**Escolher um simulador específico:**
```bash
npx expo run:ios --device "iPhone 17 Pro"
```

**Ver simuladores disponíveis:**
```bash
xcrun simctl list devices
```

---

## 3. Android — celular físico via Wi-Fi (depuração sem fio)

### 3.1. Parear (só na primeira vez, ou depois de "Esquecer" no celular)

No celular: **Ajustes → Opções do desenvolvedor → Depuração sem fio** → ativar → **"Parear dispositivo com código de pareamento"**. Anota o IP:porta e o código de 6 dígitos que aparecem.

```bash
adb pair <ip>:<porta-do-pareamento>
```
(pede o código de 6 dígitos na hora)

### 3.2. Conectar (toda vez que for testar)

Na tela principal de **Depuração sem fio** do celular (não a de pareamento), pega o IP:porta ali mostrado:

```bash
adb connect <ip>:<porta-principal>
```

Confirma que conectou:
```bash
adb devices -l
```

### 3.3. Buildar e instalar no aparelho

Com o Metro já rodando (passo 1). **Importante:** este Mac usa Java 26 por padrão, que quebra o build do Android — precisa forçar a JDK 21 instalada:

```bash
JAVA_HOME="/Users/guilherme/Library/Java/JavaVirtualMachines/temurin-21.0.12/Contents/Home" npx expo run:android --device "SM_S711B"
```

(troca `"SM_S711B"` pelo nome do aparelho que aparece em `adb devices -l`)

---

## 4. Desconectar/limpar

**Desconectar o Android sem esquecer o pareamento:**
```bash
adb disconnect
```

**Derrubar o servidor adb inteiro:**
```bash
adb kill-server
```

**Esquecer o pareamento de vez** (só dá no celular, não no terminal): Ajustes → Opções do desenvolvedor → Depuração sem fio → toca no aparelho pareado → "Esquecer".

---

## Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| App mostra código antigo depois de editar | Metro com `CI=1` não percebe mudança sozinho | `pkill -f "expo start"` + iniciar de novo |
| Build Android falha com erro de `JdkImageTransform`/`core-for-system-modules.jar` | Gradle usando Java 26 (padrão do Mac) em vez da 21 | Sempre rodar `expo run:android` com `JAVA_HOME=...temurin-21...` na frente |
| `adb devices` não mostra o celular | Depuração sem fio desativada, ou IP mudou (celular trocou de rede) | Conferir Wi-Fi do celular = mesma rede do Mac; repetir `adb connect` com o IP:porta atual |
| Erro ao conectar via Wi-Fi mesmo já pareado antes | Pareamento "expirou" ou foi esquecido | Repetir o passo 3.1 (parear de novo) |
