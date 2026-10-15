import styled from "styled-components";

export const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacingRow};
  color: ${({ theme }) => theme.colourText};
`;

export const Heading = styled.h1`
  margin: 0 0 0.4rem;
  border: none;
  font-size: ${({ theme }) => theme.fontSizeHeading};
  font-weight: bold;
  color: ${({ theme }) => theme.colourHeading};
`;

export const Subheading = styled.h2`
  align-self: center;
  margin: 0;
  border: none;
  font-size: ${({ theme }) => theme.fontSizeHeading};
`;

export const StatList = styled.ul`
  margin: 0 0 ${({ theme }) => theme.spacingSection};
  padding-left: 1.25em;
`;

export const StatLabel = styled.span`
  font-weight: bold;
`;

export const ActionButton = styled.button`
  justify-content: center;
`;
