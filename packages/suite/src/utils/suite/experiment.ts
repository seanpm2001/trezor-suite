import { createHash } from 'crypto';

import { ExperimentsItem } from '@suite-common/suite-types';

type ExperimentCategoriesProps = {
    experiment: ExperimentsItem | undefined;
    instanceId: string | undefined;
};

type ExperimentsGroupsType = ExperimentsItem['groups'];
type ExperimentsGroupType = ExperimentsGroupsType[number];

type ExperimentGetGroupByInclusion = {
    groups: ExperimentsGroupsType;
    inclusion: number;
};

/**
 * @returns number between 0 and 99 generated from instanceId
 */
export const getInclusionFromInstanceId = (instanceId: string) => {
    const hash = createHash('sha256').update(instanceId).digest('hex').slice(0, 8);

    return parseInt(hash, 16) % 100;
};

export const getExperimentGroupByInclusion = ({
    groups,
    inclusion,
}: ExperimentGetGroupByInclusion): ExperimentsGroupType | undefined => {
    let currentPercentage = 0;

    const extendedExperiment = groups.map(group => {
        const result = {
            group,
            range: [currentPercentage, currentPercentage + group.percentage - 1],
        };

        currentPercentage += group.percentage;

        return result;
    });

    return extendedExperiment.find(
        group => group.range[0] <= inclusion && group.range[1] >= inclusion,
    )?.group;
};

export const selectActiveExperimentGroup = ({
    experiment,
    instanceId,
}: ExperimentCategoriesProps): ExperimentsGroupType | undefined => {
    if (!instanceId || !experiment) return undefined;

    const inclusionFromInstanceId = getInclusionFromInstanceId(instanceId);
    const { groups } = experiment;

    const experimentRange = getExperimentGroupByInclusion({
        groups,
        inclusion: inclusionFromInstanceId,
    });

    return experimentRange;
};
