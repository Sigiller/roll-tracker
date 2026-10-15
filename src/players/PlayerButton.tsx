import styled from "styled-components";

/** Class of the element that hosts a button's React root inside a player list entry. */
export const PLAYER_BUTTON_CLASS = "roll-tracker-player-button";

const Button = styled.button`
  flex: 0 0 auto;
  align-self: center;
  width: auto;
  height: auto;
  min-height: 0;
  margin: 0 2%;
  padding: 0;
  border: 0;
  line-height: 0;
  background: transparent;
  color: inherit;

  & > i {
    margin-right: 0;
  }

  &:hover,
  &:focus-visible {
    box-shadow: none;
    text-shadow: 0 0 5px ${({ theme }) => theme.colourButtonGlow};
  }
`;

/** Props of {@link PlayerButton}. */
export interface PlayerButtonProps {
  /** Tooltip and accessible name ("Check Rolls"). */
  label: string;
  /** Opens the tracker window of the entry's user. */
  onOpen: () => void;
}

/** The d20 button next to a user's name in the player list. */
export function PlayerButton({ label, onOpen }: PlayerButtonProps) {
  return (
    <Button
      type="button"
      data-tooltip={label}
      aria-label={label}
      onClick={(event) => {
        // Don't let the click reach the player list entry
        event.stopPropagation();
        onOpen();
      }}
    >
      <i className="fas fa-dice-d20" />
    </Button>
  );
}
