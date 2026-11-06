# Learned evaluation fit

418520 positions from 27357 games · train 334182, holdout 84338 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.549 | 0.649 | 71.8 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.639 | 64.7 % |
| turns 5-8 | 21307 | 0.586 | 69.2 % |
| turns 9-12 | 19407 | 0.518 | 74.5 % |
| turns 13+ | 21781 | 0.449 | 78.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.429 |
| deck:core-nbn | -0.251 |
| runnerPointsToWin | +0.203 |
| runnerPoints | -0.203 |
| pointsToWin | -0.193 |
| points | +0.193 |
| deck:core-weyland | +0.191 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.116 |
| rdDensity | -0.112 |
| agendasInHand | -0.092 |
| deck:core-anarch | -0.090 |
| runnerCoverage | -0.087 |
| deck | +0.085 |
| runnerRig | -0.085 |
| oddsRD | -0.072 |
| agendaPointsInHand | -0.071 |
| remoteIce | +0.071 |
| creditLead | +0.069 |
| deck:core-shaper | +0.066 |
| deck:core-hb | +0.061 |
| archivesAgendas | -0.061 |
| runnerBreakers | -0.060 |
| threatLoss | -0.055 |
| runnerCredits | -0.055 |
| remotes | -0.051 |
| hqUnrezzed | +0.045 |
| remoteUnrezzed | +0.044 |
| runnerTags | +0.040 |
| unfunded | -0.038 |
| credits | +0.038 |
| rezDebt | +0.032 |
| hand | +0.031 |
| rdIce | +0.025 |
| deck:core-criminal | +0.022 |
| oddsRemote | +0.020 |
| oddsHQ | -0.017 |
| turn | -0.010 |
| runnerHand | +0.006 |
| deck:core-jinteki | -0.005 |
| economyAssets | -0.003 |
| rdUnrezzed | +0.001 |
| badPub | +0.000 |
