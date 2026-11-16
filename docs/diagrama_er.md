# Database ER diagram

```mermaid
erDiagram
  USERS ||--o{ DEVICE_ACCESS : autorizado_para
  DEVICES ||--o{ DEVICE_ACCESS : concede
  DEVICES ||--o{ READINGS : registra
  USERS {
    varchar username PK
    varchar role
    timestamptz created_at
  }
  DEVICES {
    varchar device_id PK
    varchar name
    timestamptz created_at
    timestamptz last_seen_at
  }
  DEVICE_ACCESS {
    varchar username PK, FK
    varchar device_id PK, FK
    boolean can_read
  }
  READINGS {
    bigint id PK
    varchar device_id FK
    bigint sequence
    timestamptz timestamp
    real temperature_c
    real humidity_percent
    timestamptz received_at
  }
```

A migração da API cria essas tabelas na inicialização, adiciona linhas de dispositivos existentes, prepara o usuário e dispositivo de demonstração configurados e atualiza `devices.last_seen_at` quando chega tráfego válido. A tabela `readings` tem uma restrição única em `(device_id, sequence)` para evitar duplicar envios com a mesma sequência.
