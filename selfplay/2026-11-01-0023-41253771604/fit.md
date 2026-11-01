# Learned evaluation fit

303898 positions from 19800 games · train 243398, holdout 60500 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.538 | 0.643 | 72.6 % | 65.7 % |
| holdout | 0.530 | 0.644 | 73.0 % | 65.5 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 15784 | 0.627 | 65.8 % |
| turns 5-8 | 15278 | 0.567 | 70.7 % |
| turns 9-12 | 13946 | 0.494 | 75.8 % |
| turns 13+ | 15492 | 0.426 | 80.0 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.418 |
| deck:core-nbn | -0.256 |
| runnerPoints | -0.203 |
| runnerPointsToWin | +0.203 |
| deck:core-weyland | +0.196 |
| pointsToWin | -0.186 |
| points | +0.186 |
| threatGain | +0.169 |
| remoteProgress | +0.131 |
| remoteAgendaPoints | +0.127 |
| rdDensity | -0.121 |
| hqIce | +0.120 |
| deck | +0.097 |
| deck:core-shaper | +0.096 |
| deck:core-anarch | -0.095 |
| runnerCoverage | -0.091 |
| agendasInHand | -0.086 |
| archivesAgendas | -0.086 |
| deck:core-hb | +0.080 |
| agendaPointsInHand | -0.068 |
| creditLead | +0.067 |
| remoteIce | +0.062 |
| oddsRD | -0.061 |
| runnerRig | -0.060 |
| remotes | -0.059 |
| runnerBreakers | -0.059 |
| runnerCredits | -0.057 |
| threatLoss | -0.045 |
| runnerTags | +0.043 |
| hqUnrezzed | +0.042 |
| remoteUnrezzed | +0.039 |
| hand | +0.037 |
| credits | +0.035 |
| rdIce | +0.034 |
| rezDebt | +0.032 |
| unfunded | -0.024 |
| deck:core-jinteki | -0.023 |
| oddsRemote | +0.019 |
| economyAssets | -0.012 |
| oddsHQ | -0.008 |
| rdUnrezzed | -0.005 |
| runnerHand | +0.003 |
| deck:core-criminal | -0.002 |
| turn | -0.002 |
| badPub | +0.000 |
