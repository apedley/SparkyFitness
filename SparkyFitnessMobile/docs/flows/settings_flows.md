# Settings Tab — User Flows

## Navigation Overview

```mermaid
flowchart TD
    SI[Settings Index] --> SS[Server Settings]
    SI --> HS[Health Sync]
    SI --> AP[Appearance]
    SI --> LG[Logs]
    SI --> AB[About]
    SI -.->|dev builds only| DT[Developer Tools]

    %% Server Settings flow
    SS -->|tap server| SD[Server Detail]
    SS -->|tap Add Server| AS[Add Server]
    AS -->|enter URL + Next| SD

    SD -->|tap Authentication| AUTH[Authentication]
    SD -->|toggle| ACT{Set Active Server}
    SD -->|tap| WEB[Open Web Dashboard]
    SD -->|tap Proxy Headers| PH[Proxy Headers Modal]
    SD -->|tap Delete| DEL[Delete Server → back to Server Settings]

    %% Authentication flow
    AUTH -->|Sign In tab| SIF[Sign In Form]
    AUTH -->|API Key tab| AKF[API Key Form]
    AUTH -->|signed in| SO[Sign Out]

    AKF -->|enter key + Save| SAVE_AK[Save API Key Config]

    SIF -->|enter email + password| LOGIN{Login Request}
    LOGIN -->|success| SAVE_SESSION[Save Session Config]
    LOGIN -->|MFA required| MFA[MFA Verification]

    MFA -->|TOTP| TOTP[Enter Authenticator Code]
    MFA -->|Email| EMAIL_OTP[Send Email OTP]
    EMAIL_OTP --> ENTER_OTP[Enter Email Code]
    TOTP -->|verify| SAVE_SESSION
    ENTER_OTP -->|verify| SAVE_SESSION

    %% Health Sync flow
    HS --> TM[Toggle Individual Metrics]
    HS --> TA[Toggle All Metrics]
    HS --> BG[Background Sync Toggle]
    TM -->|enable| PERM{Request Permissions}
    TA -->|enable all| PERM
    PERM -->|granted| ENABLED[Metric Enabled]
    PERM -->|denied| DISABLED[Metric Disabled + Alert]

    %% Appearance flow
    AP --> TH[Select Theme]
    TH --> LIGHT[Light]
    TH --> DARK[Dark]
    TH --> AMOLED[AMOLED]
    TH --> SYS[System]

    %% About flow
    AB --> GH[Open GitHub]
    AB --> PP[Privacy Policy Modal]
    AB --> DR[Share Diagnostic Report]

    %% Styling
    classDef screen fill:#e3f2fd,stroke:#1565c0,color:#000
    classDef modal fill:#fff3e0,stroke:#e65100,color:#000
    classDef action fill:#e8f5e9,stroke:#2e7d32,color:#000
    classDef decision fill:#fce4ec,stroke:#c62828,color:#000

    class SI,SS,SD,AS,AUTH,HS,AP,LG,AB,DT screen
    class PH,PP modal
    class SAVE_AK,SAVE_SESSION,ENABLED,DISABLED,SO,DEL,WEB,GH,DR,ACT action
    class LOGIN,PERM,MFA decision
```

## Flow Descriptions

### Server Management

1. **Add Server**: Settings Index → Server Settings → Add Server → enter URL → Next → Server Detail (new server created with URL only)
2. **Configure Auth**: Server Detail → Authentication → choose Sign In or API Key tab → complete form → config saved
3. **Sign In with MFA**: Authentication → enter credentials → MFA required → enter TOTP code or request email OTP → verify → session saved
4. **Set Active Server**: Server Detail → toggle "Use This Server" switch
5. **Configure Proxy Headers**: Server Detail → Proxy Headers → modal to add/edit/remove custom HTTP headers
6. **Delete Server**: Server Detail → Delete Server → confirmation alert → returns to Server Settings

### Health Sync

1. **Enable Metric**: Health Sync → toggle metric → permission request → granted → metric enabled with background delivery
2. **Enable All**: Health Sync → toggle "Enable All" → bulk permission request → all metrics enabled
3. **Background Sync**: Health Sync → toggle background sync → (Android: request background access permission) → configure/stop background task

### Appearance

1. **Change Theme**: Appearance → tap theme option (Light / Dark / AMOLED / System) → saved to AsyncStorage

### About

1. **View Privacy Policy**: About → tap Privacy Policy → modal displayed
2. **Share Diagnostics**: About → tap Share Diagnostic Report → exports app version, sync status, and logs
