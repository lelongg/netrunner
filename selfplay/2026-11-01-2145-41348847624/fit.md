# Learned evaluation fit

358142 positions from 23400 games · train 286834, holdout 71308 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.645 | 72.3 % | 65.3 % |
| holdout | 0.536 | 0.648 | 72.6 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 18659 | 0.633 | 65.2 % |
| turns 5-8 | 18071 | 0.574 | 70.4 % |
| turns 9-12 | 16467 | 0.501 | 75.5 % |
| turns 13+ | 18111 | 0.432 | 79.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.420 |
| deck:core-nbn | -0.253 |
| runnerPoints | -0.203 |
| runnerPointsToWin | +0.203 |
| deck:core-weyland | +0.195 |
| points | +0.189 |
| pointsToWin | -0.189 |
| threatGain | +0.171 |
| remoteProgress | +0.131 |
| remoteAgendaPoints | +0.128 |
| rdDensity | -0.123 |
| hqIce | +0.114 |
| deck:core-anarch | -0.095 |
| deck | +0.091 |
| agendasInHand | -0.089 |
| runnerCoverage | -0.087 |
| deck:core-shaper | +0.083 |
| archivesAgendas | -0.071 |
| deck:core-hb | +0.069 |
| agendaPointsInHand | -0.068 |
| creditLead | +0.064 |
| oddsRD | -0.063 |
| remotes | -0.062 |
| runnerRig | -0.061 |
| remoteIce | +0.058 |
| runnerBreakers | -0.058 |
| runnerCredits | -0.054 |
| hqUnrezzed | +0.046 |
| threatLoss | -0.043 |
| runnerTags | +0.041 |
| hand | +0.036 |
| rdIce | +0.034 |
| credits | +0.034 |
| rezDebt | +0.033 |
| remoteUnrezzed | +0.029 |
| oddsRemote | +0.019 |
| unfunded | -0.019 |
| deck:core-jinteki | -0.015 |
| oddsHQ | -0.013 |
| deck:core-criminal | +0.011 |
| economyAssets | -0.006 |
| turn | -0.004 |
| runnerHand | +0.003 |
| rdUnrezzed | -0.002 |
| badPub | +0.000 |
