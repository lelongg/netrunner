# Learned evaluation fit

418464 positions from 27357 games · train 334204, holdout 84260 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.549 | 0.648 | 71.8 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21841 | 0.639 | 64.9 % |
| turns 5-8 | 21307 | 0.586 | 69.2 % |
| turns 9-12 | 19405 | 0.517 | 74.5 % |
| turns 13+ | 21707 | 0.450 | 78.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.255 |
| runnerPoints | -0.202 |
| runnerPointsToWin | +0.202 |
| pointsToWin | -0.195 |
| points | +0.195 |
| deck:core-weyland | +0.193 |
| threatGain | +0.176 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.114 |
| rdDensity | -0.112 |
| agendasInHand | -0.089 |
| deck:core-anarch | -0.087 |
| runnerRig | -0.087 |
| deck | +0.085 |
| runnerCoverage | -0.083 |
| agendaPointsInHand | -0.071 |
| remoteIce | +0.070 |
| oddsRD | -0.069 |
| creditLead | +0.067 |
| deck:core-hb | +0.064 |
| deck:core-shaper | +0.063 |
| archivesAgendas | -0.062 |
| runnerBreakers | -0.059 |
| threatLoss | -0.057 |
| runnerCredits | -0.052 |
| remotes | -0.050 |
| hqUnrezzed | +0.046 |
| remoteUnrezzed | +0.043 |
| runnerTags | +0.040 |
| credits | +0.038 |
| unfunded | -0.035 |
| rezDebt | +0.029 |
| hand | +0.028 |
| rdIce | +0.026 |
| deck:core-criminal | +0.023 |
| oddsRemote | +0.017 |
| oddsHQ | -0.015 |
| turn | -0.012 |
| deck:core-jinteki | -0.006 |
| economyAssets | -0.005 |
| runnerHand | +0.005 |
| rdUnrezzed | -0.002 |
| badPub | +0.000 |
