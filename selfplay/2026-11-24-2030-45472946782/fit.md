# Learned evaluation fit

417940 positions from 27357 games · train 333859, holdout 84081 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.650 | 72.2 % | 64.6 % |
| holdout | 0.551 | 0.649 | 71.6 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21841 | 0.640 | 64.7 % |
| turns 5-8 | 21301 | 0.588 | 69.0 % |
| turns 9-12 | 19382 | 0.520 | 74.4 % |
| turns 13+ | 21557 | 0.451 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.431 |
| deck:core-nbn | -0.256 |
| runnerPoints | -0.203 |
| runnerPointsToWin | +0.203 |
| pointsToWin | -0.191 |
| points | +0.191 |
| deck:core-weyland | +0.190 |
| threatGain | +0.174 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.130 |
| rdDensity | -0.115 |
| hqIce | +0.111 |
| deck:core-anarch | -0.092 |
| agendasInHand | -0.091 |
| runnerCoverage | -0.087 |
| deck | +0.084 |
| runnerRig | -0.083 |
| remoteIce | +0.073 |
| agendaPointsInHand | -0.072 |
| oddsRD | -0.070 |
| creditLead | +0.068 |
| deck:core-shaper | +0.068 |
| runnerBreakers | -0.063 |
| deck:core-hb | +0.062 |
| archivesAgendas | -0.062 |
| threatLoss | -0.058 |
| runnerCredits | -0.053 |
| hqUnrezzed | +0.047 |
| remotes | -0.046 |
| runnerTags | +0.040 |
| credits | +0.039 |
| remoteUnrezzed | +0.039 |
| rezDebt | +0.036 |
| unfunded | -0.035 |
| hand | +0.032 |
| rdIce | +0.026 |
| deck:core-criminal | +0.023 |
| oddsHQ | -0.021 |
| oddsRemote | +0.021 |
| turn | -0.013 |
| runnerHand | +0.004 |
| economyAssets | -0.002 |
| rdUnrezzed | -0.001 |
| deck:core-jinteki | -0.000 |
| badPub | +0.000 |
