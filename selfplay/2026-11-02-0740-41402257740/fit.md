# Learned evaluation fit

376574 positions from 24600 games · train 301467, holdout 75107 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.647 | 72.3 % | 65.1 % |
| holdout | 0.539 | 0.650 | 72.3 % | 64.6 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 19618 | 0.635 | 64.9 % |
| turns 5-8 | 19009 | 0.576 | 70.3 % |
| turns 9-12 | 17328 | 0.504 | 75.1 % |
| turns 13+ | 19152 | 0.435 | 79.4 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.421 |
| deck:core-nbn | -0.249 |
| runnerPointsToWin | +0.204 |
| runnerPoints | -0.204 |
| deck:core-weyland | +0.198 |
| pointsToWin | -0.191 |
| points | +0.191 |
| threatGain | +0.171 |
| remoteProgress | +0.131 |
| remoteAgendaPoints | +0.128 |
| rdDensity | -0.124 |
| hqIce | +0.112 |
| deck:core-anarch | -0.092 |
| runnerCoverage | -0.091 |
| agendasInHand | -0.089 |
| deck | +0.088 |
| deck:core-shaper | +0.081 |
| agendaPointsInHand | -0.072 |
| archivesAgendas | -0.068 |
| creditLead | +0.067 |
| oddsRD | -0.066 |
| deck:core-hb | +0.063 |
| remotes | -0.062 |
| runnerBreakers | -0.061 |
| runnerRig | -0.061 |
| remoteIce | +0.058 |
| runnerCredits | -0.053 |
| hqUnrezzed | +0.047 |
| threatLoss | -0.041 |
| runnerTags | +0.040 |
| credits | +0.037 |
| hand | +0.035 |
| rezDebt | +0.034 |
| remoteUnrezzed | +0.032 |
| rdIce | +0.030 |
| unfunded | -0.021 |
| oddsRemote | +0.019 |
| oddsHQ | -0.015 |
| deck:core-jinteki | -0.015 |
| deck:core-criminal | +0.011 |
| turn | -0.004 |
| economyAssets | -0.004 |
| runnerHand | +0.002 |
| rdUnrezzed | -0.001 |
| badPub | +0.000 |
