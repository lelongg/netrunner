# Learned evaluation fit

418404 positions from 27357 games · train 334014, holdout 84390 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.650 | 72.2 % | 64.6 % |
| holdout | 0.548 | 0.647 | 71.9 % | 65.0 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.638 | 65.0 % |
| turns 5-8 | 21315 | 0.585 | 69.4 % |
| turns 9-12 | 19430 | 0.517 | 74.6 % |
| turns 13+ | 21802 | 0.451 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.431 |
| deck:core-nbn | -0.256 |
| runnerPoints | -0.203 |
| runnerPointsToWin | +0.203 |
| deck:core-weyland | +0.194 |
| points | +0.193 |
| pointsToWin | -0.193 |
| threatGain | +0.176 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.117 |
| rdDensity | -0.112 |
| deck:core-anarch | -0.093 |
| agendasInHand | -0.092 |
| runnerCoverage | -0.089 |
| deck | +0.085 |
| runnerRig | -0.085 |
| remoteIce | +0.074 |
| agendaPointsInHand | -0.072 |
| oddsRD | -0.069 |
| creditLead | +0.069 |
| deck:core-shaper | +0.066 |
| deck:core-hb | +0.064 |
| runnerBreakers | -0.064 |
| threatLoss | -0.058 |
| archivesAgendas | -0.057 |
| runnerCredits | -0.054 |
| remotes | -0.053 |
| hqUnrezzed | +0.045 |
| remoteUnrezzed | +0.042 |
| runnerTags | +0.039 |
| credits | +0.039 |
| rezDebt | +0.036 |
| unfunded | -0.033 |
| hand | +0.029 |
| rdIce | +0.028 |
| deck:core-criminal | +0.026 |
| oddsRemote | +0.017 |
| oddsHQ | -0.015 |
| turn | -0.009 |
| deck:core-jinteki | -0.006 |
| rdUnrezzed | -0.005 |
| economyAssets | -0.004 |
| runnerHand | +0.002 |
| badPub | +0.000 |
