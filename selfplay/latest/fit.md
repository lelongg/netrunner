# Learned evaluation fit

418517 positions from 27357 games · train 334297, holdout 84220 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.650 | 72.2 % | 64.6 % |
| holdout | 0.549 | 0.649 | 71.7 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.639 | 64.8 % |
| turns 5-8 | 21316 | 0.585 | 69.4 % |
| turns 9-12 | 19413 | 0.517 | 74.5 % |
| turns 13+ | 21648 | 0.451 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.254 |
| runnerPoints | -0.200 |
| runnerPointsToWin | +0.200 |
| deck:core-weyland | +0.196 |
| points | +0.195 |
| pointsToWin | -0.195 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.129 |
| hqIce | +0.114 |
| rdDensity | -0.113 |
| runnerCoverage | -0.091 |
| agendasInHand | -0.090 |
| deck:core-anarch | -0.087 |
| runnerRig | -0.084 |
| deck | +0.084 |
| agendaPointsInHand | -0.072 |
| creditLead | +0.071 |
| remoteIce | +0.068 |
| oddsRD | -0.067 |
| runnerBreakers | -0.064 |
| deck:core-shaper | +0.063 |
| deck:core-hb | +0.062 |
| threatLoss | -0.060 |
| archivesAgendas | -0.059 |
| runnerCredits | -0.053 |
| remotes | -0.048 |
| hqUnrezzed | +0.043 |
| remoteUnrezzed | +0.042 |
| credits | +0.042 |
| runnerTags | +0.038 |
| rezDebt | +0.037 |
| unfunded | -0.030 |
| hand | +0.029 |
| rdIce | +0.023 |
| deck:core-criminal | +0.023 |
| oddsRemote | +0.019 |
| oddsHQ | -0.018 |
| turn | -0.012 |
| deck:core-jinteki | -0.008 |
| economyAssets | -0.004 |
| runnerHand | +0.002 |
| rdUnrezzed | +0.000 |
| badPub | +0.000 |
