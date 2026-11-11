# Learned evaluation fit

418212 positions from 27357 games · train 334036, holdout 84176 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.1 % | 64.7 % |
| holdout | 0.548 | 0.649 | 71.9 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.638 | 65.0 % |
| turns 5-8 | 21295 | 0.584 | 69.5 % |
| turns 9-12 | 19399 | 0.516 | 74.7 % |
| turns 13+ | 21640 | 0.450 | 78.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.428 |
| deck:core-nbn | -0.253 |
| runnerPoints | -0.201 |
| runnerPointsToWin | +0.201 |
| deck:core-weyland | +0.195 |
| points | +0.193 |
| pointsToWin | -0.193 |
| threatGain | +0.176 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.130 |
| rdDensity | -0.110 |
| hqIce | +0.109 |
| deck:core-anarch | -0.091 |
| agendasInHand | -0.090 |
| runnerRig | -0.085 |
| runnerCoverage | -0.083 |
| deck | +0.080 |
| agendaPointsInHand | -0.069 |
| creditLead | +0.069 |
| remoteIce | +0.068 |
| oddsRD | -0.067 |
| archivesAgendas | -0.066 |
| deck:core-shaper | +0.066 |
| deck:core-hb | +0.061 |
| runnerBreakers | -0.059 |
| threatLoss | -0.057 |
| remotes | -0.053 |
| runnerCredits | -0.052 |
| hqUnrezzed | +0.040 |
| runnerTags | +0.040 |
| credits | +0.040 |
| remoteUnrezzed | +0.039 |
| rezDebt | +0.035 |
| unfunded | -0.031 |
| hand | +0.025 |
| deck:core-criminal | +0.024 |
| rdIce | +0.023 |
| oddsHQ | -0.020 |
| oddsRemote | +0.017 |
| turn | -0.009 |
| deck:core-jinteki | -0.007 |
| economyAssets | -0.007 |
| runnerHand | +0.003 |
| rdUnrezzed | -0.000 |
| badPub | +0.000 |
