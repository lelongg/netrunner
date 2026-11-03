# Learned evaluation fit

418804 positions from 27357 games · train 334448, holdout 84356 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.548 | 0.649 | 71.8 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.638 | 64.9 % |
| turns 5-8 | 21312 | 0.584 | 69.3 % |
| turns 9-12 | 19417 | 0.517 | 74.6 % |
| turns 13+ | 21785 | 0.450 | 78.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.425 |
| deck:core-nbn | -0.254 |
| runnerPointsToWin | +0.201 |
| runnerPoints | -0.201 |
| deck:core-weyland | +0.193 |
| pointsToWin | -0.192 |
| points | +0.192 |
| threatGain | +0.176 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| rdDensity | -0.116 |
| hqIce | +0.112 |
| agendasInHand | -0.088 |
| runnerCoverage | -0.087 |
| deck:core-anarch | -0.087 |
| deck | +0.084 |
| runnerRig | -0.083 |
| remoteIce | +0.072 |
| oddsRD | -0.071 |
| agendaPointsInHand | -0.069 |
| creditLead | +0.069 |
| deck:core-hb | +0.065 |
| threatLoss | -0.062 |
| archivesAgendas | -0.061 |
| runnerBreakers | -0.061 |
| deck:core-shaper | +0.059 |
| runnerCredits | -0.053 |
| remotes | -0.050 |
| hqUnrezzed | +0.044 |
| remoteUnrezzed | +0.040 |
| credits | +0.040 |
| runnerTags | +0.038 |
| rezDebt | +0.035 |
| unfunded | -0.031 |
| hand | +0.030 |
| deck:core-criminal | +0.027 |
| rdIce | +0.020 |
| oddsRemote | +0.020 |
| oddsHQ | -0.018 |
| turn | -0.010 |
| deck:core-jinteki | -0.009 |
| economyAssets | -0.006 |
| runnerHand | +0.004 |
| rdUnrezzed | +0.000 |
| badPub | +0.000 |
