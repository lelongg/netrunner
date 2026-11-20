# Learned evaluation fit

417912 positions from 27357 games · train 333824, holdout 84088 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.550 | 0.649 | 71.7 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21839 | 0.639 | 64.9 % |
| turns 5-8 | 21305 | 0.586 | 69.3 % |
| turns 9-12 | 19367 | 0.518 | 74.4 % |
| turns 13+ | 21577 | 0.452 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.254 |
| runnerPointsToWin | +0.205 |
| runnerPoints | -0.205 |
| deck:core-weyland | +0.199 |
| points | +0.191 |
| pointsToWin | -0.191 |
| threatGain | +0.174 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.111 |
| rdDensity | -0.109 |
| agendasInHand | -0.090 |
| deck:core-anarch | -0.089 |
| runnerCoverage | -0.087 |
| runnerRig | -0.084 |
| deck | +0.081 |
| agendaPointsInHand | -0.072 |
| remoteIce | +0.071 |
| creditLead | +0.069 |
| oddsRD | -0.068 |
| deck:core-shaper | +0.065 |
| runnerBreakers | -0.063 |
| threatLoss | -0.062 |
| deck:core-hb | +0.061 |
| archivesAgendas | -0.058 |
| runnerCredits | -0.054 |
| remotes | -0.046 |
| hqUnrezzed | +0.043 |
| runnerTags | +0.040 |
| remoteUnrezzed | +0.040 |
| credits | +0.039 |
| rezDebt | +0.036 |
| unfunded | -0.034 |
| hand | +0.027 |
| rdIce | +0.027 |
| deck:core-criminal | +0.023 |
| oddsRemote | +0.019 |
| oddsHQ | -0.015 |
| deck:core-jinteki | -0.010 |
| turn | -0.006 |
| economyAssets | -0.003 |
| rdUnrezzed | -0.002 |
| runnerHand | +0.002 |
| badPub | +0.000 |
