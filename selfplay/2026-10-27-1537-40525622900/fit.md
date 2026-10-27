# Learned evaluation fit

47619 positions from 3000 games · train 38194, holdout 9425 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.531 | 0.639 | 72.6 % | 66.3 % |
| holdout | 0.539 | 0.654 | 71.1 % | 63.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 2389 | 0.634 | 63.4 % |
| turns 5-8 | 2309 | 0.585 | 68.3 % |
| turns 9-12 | 2135 | 0.501 | 75.3 % |
| turns 13+ | 2592 | 0.440 | 77.4 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.394 |
| deck:core-nbn | -0.250 |
| runnerPoints | -0.216 |
| runnerPointsToWin | +0.216 |
| deck:core-hb | +0.209 |
| deck:core-weyland | +0.179 |
| points | +0.171 |
| pointsToWin | -0.171 |
| threatGain | +0.146 |
| deck:core-jinteki | -0.141 |
| rdDensity | -0.135 |
| hqIce | +0.133 |
| oddsRD | -0.117 |
| runnerCoverage | -0.110 |
| remoteProgress | +0.109 |
| remoteAgendaPoints | +0.097 |
| archivesAgendas | -0.093 |
| remoteIce | +0.093 |
| remotes | -0.073 |
| deck:core-shaper | +0.071 |
| agendasInHand | -0.071 |
| turn | +0.069 |
| creditLead | +0.068 |
| runnerBreakers | -0.066 |
| rdUnrezzed | -0.063 |
| hqUnrezzed | +0.062 |
| deck | +0.062 |
| threatLoss | -0.059 |
| economyAssets | -0.051 |
| agendaPointsInHand | -0.046 |
| runnerCredits | -0.045 |
| credits | +0.044 |
| hand | +0.043 |
| deck:core-anarch | -0.036 |
| deck:core-criminal | -0.036 |
| oddsHQ | +0.029 |
| remoteUnrezzed | +0.028 |
| oddsRemote | +0.027 |
| rdIce | +0.027 |
| rezDebt | +0.024 |
| runnerTags | +0.020 |
| runnerHand | -0.019 |
| unfunded | +0.012 |
| runnerRig | -0.002 |
| badPub | +0.000 |
